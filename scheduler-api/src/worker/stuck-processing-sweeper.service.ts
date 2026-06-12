import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { SseService } from '../common/sse/sse.service';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import {
  STUCK_PROCESSING_SWEEP_INTERVAL_MS,
  STUCK_PROCESSING_TIMEOUT_MS,
} from './constants';
import { JobLogger } from './job-logger.service';

@Injectable()
export class StuckProcessingSweeperService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StuckProcessingSweeperService.name);
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly jobLogger: JobLogger,
    private readonly sseService: SseService,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.sweepOnce().catch((error: unknown) => {
        this.logger.error('Failed to sweep stuck processing jobs', error);
      });
    }, STUCK_PROCESSING_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async sweepOnce(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - STUCK_PROCESSING_TIMEOUT_MS);
    const stuckJobs = await this.jobsRepository.find({
      where: {
        status: JobStatus.PROCESSING,
        startedAt: LessThanOrEqual(cutoff),
      },
    });

    let sweptCount = 0;

    for (const job of stuckJobs) {
      const nextRetryCount = job.retryCount + 1;
      const timeoutMessage = `Job exceeded processing timeout of ${STUCK_PROCESSING_TIMEOUT_MS}ms`;

      if (nextRetryCount >= job.maxRetries) {
        const result = await this.jobsRepository
          .createQueryBuilder()
          .update(Job)
          .set({
            status: JobStatus.FAILED,
            inDlq: true,
            retryCount: nextRetryCount,
            completedAt: now,
            errorMessage: timeoutMessage,
          })
          .where('id = :id', { id: job.id })
          .andWhere('status = :status', { status: JobStatus.PROCESSING })
          .andWhere('startedAt <= :cutoff', { cutoff })
          .execute();

        if ((result.affected ?? 0) === 0) {
          continue;
        }

        sweptCount += 1;
        this.sseService.emit('job_updated', {
          jobId: job.id,
          status: JobStatus.FAILED,
          retryCount: nextRetryCount,
          inDlq: true,
        });
        await this.jobLogger.log(
          job.id,
          'processing_timeout_dlq',
          `${timeoutMessage}; retries exhausted (${nextRetryCount}/${job.maxRetries})`,
        );
        continue;
      }

      const result = await this.jobsRepository
        .createQueryBuilder()
        .update(Job)
        .set({
          status: JobStatus.PENDING,
          startedAt: null,
          scheduledAt: now,
          retryCount: nextRetryCount,
          errorMessage: timeoutMessage,
        })
        .where('id = :id', { id: job.id })
        .andWhere('status = :status', { status: JobStatus.PROCESSING })
        .andWhere('startedAt <= :cutoff', { cutoff })
        .execute();

      if ((result.affected ?? 0) === 0) {
        continue;
      }

      sweptCount += 1;
      this.sseService.emit('job_updated', {
        jobId: job.id,
        status: JobStatus.PENDING,
        retryCount: nextRetryCount,
      });
      await this.jobLogger.log(
        job.id,
        'processing_timeout_requeued',
        `${timeoutMessage}; retry ${nextRetryCount}/${job.maxRetries} scheduled immediately`,
      );
    }

    if (sweptCount > 0) {
      this.logger.warn(`Swept ${sweptCount} stuck processing job(s).`);
    }

    return sweptCount;
  }
}
