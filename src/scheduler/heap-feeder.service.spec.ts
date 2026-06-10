import { FindManyOptions, LessThanOrEqual, Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import {
  HeapFeederService,
  MIN_PRIORITY,
  STARVATION_SWEEP_INTERVAL_MS,
  STARVATION_THRESHOLD_MS,
} from './heap-feeder.service';
import { JobPriorityHeap } from './job-priority-heap';

type MockRepository = {
  createQueryBuilder: jest.Mock;
  find: jest.Mock;
  findOneBy: jest.Mock;
};

type MockQueryBuilder = {
  andWhere: jest.Mock;
  execute: jest.Mock;
  set: jest.Mock;
  update: jest.Mock;
  where: jest.Mock;
};

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

const createQueryBuilder = (): MockQueryBuilder => {
  const queryBuilder = {
    andWhere: jest.fn(),
    execute: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn(),
  };

  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.set.mockReturnValue(queryBuilder);
  queryBuilder.update.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);

  return queryBuilder;
};

const createRepository = (): MockRepository => ({
  createQueryBuilder: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
});

const createService = (
  repository: MockRepository,
  heap = new JobPriorityHeap(),
): HeapFeederService =>
  new HeapFeederService(repository as unknown as Repository<Job>, heap);

describe('HeapFeederService', () => {
  it('loads due pending jobs into the heap once', async () => {
    const repository = createRepository();
    const service = createService(repository);
    const now = new Date('2026-06-09T10:00:00.000Z');

    repository.find.mockResolvedValue([
      createJob({ id: 'job-1' }),
      createJob({ id: 'job-2' }),
    ]);

    await expect(service.feedHeapOnce(now)).resolves.toBe(2);
    await expect(service.feedHeapOnce(now)).resolves.toBe(0);

    expect(service.getHeapSize()).toBe(2);
    const [findOptions] = repository.find.mock.calls[0] as [
      FindManyOptions<Job>,
    ];

    expect(findOptions.where).toMatchObject({
      status: JobStatus.PENDING,
    });
    expect(findOptions.order).toEqual({
      priority: 'ASC',
      scheduledAt: 'ASC',
      createdAt: 'ASC',
    });
  });

  it('ignores future scheduled jobs', async () => {
    const repository = createRepository();
    const service = createService(repository);
    const now = new Date('2026-06-09T10:00:00.000Z');

    repository.find.mockResolvedValue([]);

    await expect(service.feedHeapOnce(now)).resolves.toBe(0);

    const [findOptions] = repository.find.mock.calls[0] as [
      FindManyOptions<Job>,
    ];

    expect(findOptions.where).toMatchObject({
      status: JobStatus.PENDING,
      scheduledAt: LessThanOrEqual(now),
    });
  });

  it('ignores non-pending jobs in the database query', async () => {
    const repository = createRepository();
    const service = createService(repository);
    const now = new Date('2026-06-09T10:00:00.000Z');

    repository.find.mockResolvedValue([]);
    await service.feedHeapOnce(now);

    const [findOptions] = repository.find.mock.calls[0] as [
      FindManyOptions<Job>,
    ];

    expect(findOptions.where).toMatchObject({
      status: JobStatus.PENDING,
    });
  });

  it('removes a job from inHeap when popped', async () => {
    const repository = createRepository();
    const service = createService(repository);
    const job = createJob({ id: 'job-1' });

    repository.find.mockResolvedValue([job]);
    repository.findOneBy.mockResolvedValue(job);

    await service.feedHeapOnce();

    await expect(service.popNextJob()).resolves.toBe(job);
    expect(service.getHeapSize()).toBe(0);

    await expect(service.feedHeapOnce()).resolves.toBe(1);
    expect(service.getHeapSize()).toBe(1);
  });

  it('bumps starving pending jobs down by one priority level', async () => {
    const repository = createRepository();
    const queryBuilder = createQueryBuilder();
    const service = createService(repository);
    const now = new Date('2026-06-09T10:00:00.000Z');
    const expectedCutoff = new Date(now.getTime() - STARVATION_THRESHOLD_MS);
    const expectedBoostCutoff = new Date(
      now.getTime() - STARVATION_SWEEP_INTERVAL_MS,
    );

    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    queryBuilder.execute.mockResolvedValue({ affected: 3 });
    repository.find.mockResolvedValue([]);

    await expect(service.preventStarvationOnce(now)).resolves.toBe(3);

    expect(queryBuilder.update).toHaveBeenCalledWith(Job);
    const [setValue] = queryBuilder.set.mock.calls[0] as [
      { priority: () => string; lastPriorityBoostedAt: () => string },
    ];

    expect(setValue.priority()).toBe(
      `GREATEST("priority" - 1, ${MIN_PRIORITY})`,
    );
    expect(setValue.lastPriorityBoostedAt()).toBe('CURRENT_TIMESTAMP');
    expect(queryBuilder.where).toHaveBeenCalledWith('"status" = :status', {
      status: JobStatus.PENDING,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '"scheduledAt" <= :starvationCutoff',
      { starvationCutoff: expectedCutoff },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '"priority" > :minPriority',
      { minPriority: MIN_PRIORITY },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '"lastPriorityBoostedAt" IS NULL OR "lastPriorityBoostedAt" <= :boostCutoff',
      { boostCutoff: expectedBoostCutoff },
    );
  });
});
