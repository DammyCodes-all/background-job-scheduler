import { Job, JobStatus } from '../jobs/entities/job.entity';
import { JobPriorityHeap } from './job-priority-heap';

const createJob = (overrides: Partial<Job>): Job => {
  return {
    id: 'job-1',
    type: 'send_email',
    priority: 1,
    status: JobStatus.PENDING,
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: new Date('2026-06-09T10:00:00.000Z'),
    dependencyIds: [],
    inDlq: false,
    createdAt: new Date('2026-06-09T10:00:00.000Z'),
    ...overrides,
  };
};

describe('JobPriorityHeap', () => {
  it('orders by priority, scheduled time, then creation time', () => {
    const heap = new JobPriorityHeap();

    heap.push(
      createJob({
        id: 'later-high-priority',
        priority: 1,
        scheduledAt: new Date('2026-06-09T10:05:00.000Z'),
        createdAt: new Date('2026-06-09T10:00:00.000Z'),
      }),
    );
    heap.push(
      createJob({
        id: 'earlier-low-priority',
        priority: 2,
        scheduledAt: new Date('2026-06-09T09:00:00.000Z'),
        createdAt: new Date('2026-06-09T09:00:00.000Z'),
      }),
    );
    heap.push(
      createJob({
        id: 'earlier-high-priority',
        priority: 1,
        scheduledAt: new Date('2026-06-09T10:00:00.000Z'),
        createdAt: new Date('2026-06-09T10:00:00.000Z'),
      }),
    );
    heap.push(
      createJob({
        id: 'oldest-created-high-priority',
        priority: 1,
        scheduledAt: new Date('2026-06-09T10:00:00.000Z'),
        createdAt: new Date('2026-06-09T09:59:00.000Z'),
      }),
    );

    expect(heap.pop()?.id).toBe('oldest-created-high-priority');
    expect(heap.pop()?.id).toBe('earlier-high-priority');
    expect(heap.pop()?.id).toBe('later-high-priority');
    expect(heap.pop()?.id).toBe('earlier-low-priority');
  });
});
