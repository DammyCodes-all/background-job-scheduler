import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SseService } from '../common/sse/sse.service';
import { Job, JobInterval, JobStatus } from '../jobs/entities/job.entity';
import { HeapFeederService } from '../scheduler/heap-feeder.service';
import {
  BACKOFF_DELAYS_MS,
  BACKOFF_JITTER_FACTOR,
  DEPENDENCY_REQUEUE_DELAY_MS,
  DLQ_ALERT_COOLDOWN_MS,
  DLQ_THRESHOLD,
  REPEAT_INTERVAL_MS,
  WORKER_INTERVAL_MS,
} from './constants';
import { DefaultJobHandler } from './default-job-handler';
import { DlqAlertHandler } from './handlers/dlq-alert.handler';
import { EmailHandler } from './handlers/email.handler';
import { HandlersRegistry } from './handlers-registry';
import { JobLogger } from './job-logger.service';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private timer?: ReturnType<typeof setTimeout>;
  private lastDlqAlertAt = 0;

  constructor(
    private readonly heapFeeder: HeapFeederService,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly jobLogger: JobLogger,
    private readonly handlersRegistry: HandlersRegistry,
    private readonly defaultHandler: DefaultJobHandler,
    private readonly dlqAlertHandler: DlqAlertHandler,
    private readonly emailHandler: EmailHandler,
    private readonly sseService: SseService,
  ) {}

  onModuleInit(): void {
    this.handlersRegistry.register('dlq_alert', this.dlqAlertHandler);
    this.handlersRegistry.register('send_email', this.emailHandler);
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  async tick(): Promise<void> {
    const job = await this.heapFeeder.popNextJob();

    if (!job) {
      return;
    }

    const claimed = await this.tryClaim(job);

    if (!claimed) {
      return;
    }

    this.sseService.emit('job_updated', {
      jobId: job.id,
      status: JobStatus.PROCESSING,
    });
    await this.jobLogger.log(job.id, 'processing', 'Worker picked up job');

    const depsMet = await this.checkDependencies(job);

    if (!depsMet) {
      await this.requeueForDependencies(job);
      return;
    }

    try {
      const handler =
        this.handlersRegistry.get(job.type) ?? this.defaultHandler;

      await handler.execute(job);
      await this.handleSuccess(job);
    } catch (err: unknown) {
      try {
        await this.handleFailure(job, err);
      } catch (innerErr) {
        this.logger.error(`handleFailure threw for job ${job.id}:`, innerErr);
      }
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.tick().finally(() => {
        this.scheduleNext();
      });
    }, WORKER_INTERVAL_MS);
  }

  private async tryClaim(job: Job): Promise<boolean> {
    const result = await this.jobsRepository
      .createQueryBuilder()
      .update(Job)
      .set({
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      })
      .where('id = :id', { id: job.id })
      .andWhere('status = :status', { status: JobStatus.PENDING })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private async checkDependencies(job: Job): Promise<boolean> {
    if (!job.dependencyIds || job.dependencyIds.length === 0) {
      return true;
    }

    const deps = await this.jobsRepository.findBy({
      id: In(job.dependencyIds),
    });

    return deps.every((d) => d.status === JobStatus.COMPLETED);
  }

  private async requeueForDependencies(job: Job): Promise<void> {
    await this.jobsRepository.update(job.id, {
      status: JobStatus.PENDING,
      scheduledAt: new Date(Date.now() + DEPENDENCY_REQUEUE_DELAY_MS),
      startedAt: null,
    });
    await this.jobLogger.log(
      job.id,
      'dependency_not_met',
      `Re-queued with ${DEPENDENCY_REQUEUE_DELAY_MS}ms delay`,
    );
  }

  private async handleSuccess(job: Job): Promise<void> {
    await this.jobsRepository.update(job.id, {
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
    });
    this.sseService.emit('job_updated', {
      jobId: job.id,
      status: JobStatus.COMPLETED,
    });
    await this.jobLogger.log(job.id, 'completed', 'Job completed successfully');

    if (job.interval) {
      const nextScheduledAt = this.calculateNextSchedule(job.interval);

      const nextJob = await this.jobsRepository.save({
        type: job.type,
        payload: job.payload,
        priority: job.priority,
        maxRetries: job.maxRetries,
        interval: job.interval,
        dependencyIds: job.dependencyIds,
        scheduledAt: nextScheduledAt,
        status: JobStatus.PENDING,
        retryCount: 0,
      });

      this.sseService.emit('job_created', {
        jobId: nextJob.id,
        status: nextJob.status,
        type: nextJob.type,
      });
    }
  }

  private async handleFailure(job: Job, error: unknown): Promise<void> {
    const newRetryCount = job.retryCount + 1;
    const errMsg = error instanceof Error ? error.message : String(error);

    if (newRetryCount >= job.maxRetries) {
      await this.jobsRepository.update(job.id, {
        status: JobStatus.FAILED,
        errorMessage: errMsg,
        completedAt: new Date(),
        inDlq: true,
        retryCount: newRetryCount,
      });
      this.sseService.emit('job_updated', {
        jobId: job.id,
        status: JobStatus.FAILED,
        inDlq: true,
      });
      await this.jobLogger.log(
        job.id,
        'failed',
        `Failed after ${newRetryCount} retries: ${errMsg}`,
      );

      const now = Date.now();
      const dlqCount = await this.jobsRepository.countBy({ inDlq: true });

      if (
        dlqCount >= DLQ_THRESHOLD &&
        now - this.lastDlqAlertAt >= DLQ_ALERT_COOLDOWN_MS
      ) {
        this.lastDlqAlertAt = now;
        const alertJob = await this.jobsRepository.save({
          type: 'dlq_alert',
          payload: { dlqCount },
          priority: 0,
          status: JobStatus.PENDING,
          scheduledAt: new Date(),
        });
        this.sseService.emit('dlq_alert', {
          dlqCount,
          alertJobId: alertJob.id,
        });
        await this.jobLogger.log(
          job.id,
          'dlq_alert_triggered',
          `DLQ count hit ${DLQ_THRESHOLD}`,
        );
      }
    } else {
      const delayMs = this.calculateBackoff(newRetryCount);

      await this.jobsRepository.update(job.id, {
        status: JobStatus.PENDING,
        startedAt: null,
        scheduledAt: new Date(Date.now() + delayMs),
        errorMessage: errMsg,
        retryCount: newRetryCount,
      });
      this.sseService.emit('job_updated', {
        jobId: job.id,
        status: JobStatus.PENDING,
        retryCount: newRetryCount,
      });
      await this.jobLogger.log(
        job.id,
        'retry_scheduled',
        `Retry ${newRetryCount}/${job.maxRetries} in ${delayMs}ms: ${errMsg}`,
      );
    }
  }

  private calculateBackoff(retryCount: number): number {
    const index = Math.min(retryCount - 1, BACKOFF_DELAYS_MS.length - 1);
    const baseDelay = BACKOFF_DELAYS_MS[index];
    const jitter =
      1 - BACKOFF_JITTER_FACTOR + Math.random() * BACKOFF_JITTER_FACTOR * 2;

    return Math.floor(baseDelay * jitter);
  }

  private calculateNextSchedule(interval: JobInterval): Date {
    const ms = REPEAT_INTERVAL_MS[interval];

    return new Date(Date.now() + ms);
  }
}
