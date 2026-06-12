/* eslint-disable @typescript-eslint/unbound-method */

import { Repository } from 'typeorm';
import { SseService } from '../common/sse/sse.service';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { STUCK_PROCESSING_TIMEOUT_MS } from './constants';
import { JobLogger } from './job-logger.service';
import { StuckProcessingSweeperService } from './stuck-processing-sweeper.service';

const NOW = new Date('2026-06-12T12:00:00.000Z');

const createJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  type: 'send_email',
  priority: 1,
  status: JobStatus.PROCESSING,
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: new Date('2026-06-12T11:00:00.000Z'),
  dependencyIds: [],
  inDlq: false,
  createdAt: new Date('2026-06-12T10:00:00.000Z'),
  startedAt: new Date(NOW.getTime() - STUCK_PROCESSING_TIMEOUT_MS - 1),
  ...overrides,
});

describe('StuckProcessingSweeperService', () => {
  let jobsRepository: jest.Mocked<
    Pick<Repository<Job>, 'find' | 'createQueryBuilder'>
  >;
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let jobLogger: jest.Mocked<JobLogger>;
  let sseService: jest.Mocked<SseService>;
  let service: StuckProcessingSweeperService;

  beforeEach(() => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jobsRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    jobLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<JobLogger>;

    sseService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<SseService>;

    service = new StuckProcessingSweeperService(
      jobsRepository as unknown as Repository<Job>,
      jobLogger,
      sseService,
    );
  });

  it('does nothing when no processing jobs exceed the timeout', async () => {
    jobsRepository.find.mockResolvedValue([]);

    const sweptCount = await service.sweepOnce(NOW);

    expect(sweptCount).toBe(0);
    expect(jobsRepository.find).toHaveBeenCalledWith({
      where: {
        status: JobStatus.PROCESSING,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        startedAt: expect.objectContaining({
          _type: 'lessThanOrEqual',
          _value: new Date(NOW.getTime() - STUCK_PROCESSING_TIMEOUT_MS),
        }),
      },
    });
    expect(jobsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(sseService.emit).not.toHaveBeenCalled();
    expect(jobLogger.log).not.toHaveBeenCalled();
  });

  it('requeues a stuck processing job when retries remain', async () => {
    jobsRepository.find.mockResolvedValue([
      createJob({ id: 'job-retry', retryCount: 0, maxRetries: 3 }),
    ]);

    const sweptCount = await service.sweepOnce(NOW);

    expect(sweptCount).toBe(1);
    expect(queryBuilder.set).toHaveBeenCalledWith({
      status: JobStatus.PENDING,
      startedAt: null,
      scheduledAt: NOW,
      retryCount: 1,
      errorMessage: `Job exceeded processing timeout of ${STUCK_PROCESSING_TIMEOUT_MS}ms`,
    });
    expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', {
      id: 'job-retry',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('status = :status', {
      status: JobStatus.PROCESSING,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('startedAt <= :cutoff', {
      cutoff: new Date(NOW.getTime() - STUCK_PROCESSING_TIMEOUT_MS),
    });
    expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
      jobId: 'job-retry',
      status: JobStatus.PENDING,
      retryCount: 1,
    });
    expect(jobLogger.log).toHaveBeenCalledWith(
      'job-retry',
      'processing_timeout_requeued',
      expect.stringContaining('retry 1/3'),
    );
  });

  it('moves a stuck processing job to the DLQ when retries are exhausted', async () => {
    jobsRepository.find.mockResolvedValue([
      createJob({ id: 'job-dlq', retryCount: 2, maxRetries: 3 }),
    ]);

    const sweptCount = await service.sweepOnce(NOW);

    expect(sweptCount).toBe(1);
    expect(queryBuilder.set).toHaveBeenCalledWith({
      status: JobStatus.FAILED,
      inDlq: true,
      retryCount: 3,
      completedAt: NOW,
      errorMessage: `Job exceeded processing timeout of ${STUCK_PROCESSING_TIMEOUT_MS}ms`,
    });
    expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
      jobId: 'job-dlq',
      status: JobStatus.FAILED,
      retryCount: 3,
      inDlq: true,
    });
    expect(jobLogger.log).toHaveBeenCalledWith(
      'job-dlq',
      'processing_timeout_dlq',
      expect.stringContaining('retries exhausted (3/3)'),
    );
  });

  it('does not emit or log when the race-safe update affects no rows', async () => {
    jobsRepository.find.mockResolvedValue([
      createJob({ id: 'job-raced', retryCount: 0, maxRetries: 3 }),
    ]);
    queryBuilder.execute.mockResolvedValue({ affected: 0 });

    const sweptCount = await service.sweepOnce(NOW);

    expect(sweptCount).toBe(0);
    expect(sseService.emit).not.toHaveBeenCalled();
    expect(jobLogger.log).not.toHaveBeenCalled();
  });
});
