import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { JobPriorityHeap } from './job-priority-heap';

export const HEAP_FEED_INTERVAL_MS = 500;
export const STARVATION_SWEEP_INTERVAL_MS = 30_000;
export const STARVATION_THRESHOLD_MS = 2 * 60 * 1000;
export const MIN_PRIORITY = 1;

@Injectable()
export class HeapFeederService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeapFeederService.name);
  private readonly inHeap = new Set<string>();
  private feedInterval?: ReturnType<typeof setInterval>;
  private starvationInterval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly jobPriorityHeap: JobPriorityHeap,
  ) {}

  onModuleInit(): void {
    this.feedInterval = setInterval(() => {
      void this.feedHeapOnce().catch((error: unknown) => {
        this.logger.error('Failed to feed job heap', error);
      });
    }, HEAP_FEED_INTERVAL_MS);

    this.starvationInterval = setInterval(() => {
      void this.preventStarvationOnce().catch((error: unknown) => {
        this.logger.error('Failed to run starvation prevention', error);
      });
    }, STARVATION_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.feedInterval) {
      clearInterval(this.feedInterval);
    }

    if (this.starvationInterval) {
      clearInterval(this.starvationInterval);
    }
  }

  async feedHeapOnce(now = new Date()): Promise<number> {
    const jobs = await this.jobsRepository.find({
      where: {
        status: JobStatus.PENDING,
        scheduledAt: LessThanOrEqual(now),
      },
      order: {
        priority: 'ASC',
        scheduledAt: 'ASC',
        createdAt: 'ASC',
      },
    });

    let addedCount = 0;

    for (const job of jobs) {
      if (this.inHeap.has(job.id)) {
        continue;
      }

      this.jobPriorityHeap.push({
        id: job.id,
        priority: job.priority,
        scheduledAt: job.scheduledAt,
        createdAt: job.createdAt,
      });
      this.inHeap.add(job.id);
      addedCount += 1;
    }

    return addedCount;
  }

  async preventStarvationOnce(now = new Date()): Promise<number> {
    const starvationCutoff = new Date(now.getTime() - STARVATION_THRESHOLD_MS);
    const boostCutoff = new Date(now.getTime() - STARVATION_SWEEP_INTERVAL_MS);

    const result = await this.jobsRepository
      .createQueryBuilder()
      .update(Job)
      .set({
        priority: () => `GREATEST("priority" - 1, ${MIN_PRIORITY})`,
        lastPriorityBoostedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('"status" = :status', { status: JobStatus.PENDING })
      .andWhere('"scheduledAt" <= :starvationCutoff', { starvationCutoff })
      .andWhere('"priority" > :minPriority', { minPriority: MIN_PRIORITY })
      .andWhere(
        '"lastPriorityBoostedAt" IS NULL OR "lastPriorityBoostedAt" <= :boostCutoff',
        { boostCutoff },
      )
      .execute();

    const boostedCount = result.affected ?? 0;

    if (boostedCount > 0) {
      this.resetHeap();
      await this.feedHeapOnce(now);
      this.logger.log(
        `Boosted ${boostedCount} starving pending job(s). Threshold: ${STARVATION_THRESHOLD_MS}ms.`,
      );
    }

    return boostedCount;
  }

  async popNextJob(): Promise<Job | undefined> {
    const entry = this.jobPriorityHeap.pop();

    if (!entry) {
      return undefined;
    }

    this.inHeap.delete(entry.id);

    const job = await this.jobsRepository.findOneBy({ id: entry.id });

    return job ?? undefined;
  }

  markRemovedFromHeap(jobId: string): void {
    this.inHeap.delete(jobId);
  }

  getHeapSize(): number {
    return this.jobPriorityHeap.size();
  }

  private resetHeap(): void {
    this.jobPriorityHeap.clear();
    this.inHeap.clear();
  }
}
