import { JobInterval } from '../jobs/entities/job.entity';

export const WORKER_INTERVAL_MS = 1_000;
export const DEPENDENCY_REQUEUE_DELAY_MS = 10_000;
export const DLQ_THRESHOLD = 10;

export const BACKOFF_DELAYS_MS = [1_000, 5_000, 25_000];
export const BACKOFF_JITTER_FACTOR = 0.5;

export const REPEAT_INTERVAL_MS: Record<JobInterval, number> = {
  [JobInterval.EVERY_MINUTE]: 60_000,
  [JobInterval.EVERY_5_MINUTES]: 5 * 60_000,
  [JobInterval.EVERY_15_MINUTES]: 15 * 60_000,
  [JobInterval.EVERY_30_MINUTES]: 30 * 60_000,
  [JobInterval.HOURLY]: 60 * 60_000,
  [JobInterval.DAILY]: 24 * 60 * 60_000,
  [JobInterval.WEEKLY]: 7 * 24 * 60 * 60_000,
  [JobInterval.MONTHLY]: 30 * 24 * 60 * 60_000,
};
