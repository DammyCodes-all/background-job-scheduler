/* eslint-disable @typescript-eslint/unbound-method */

import { Repository } from 'typeorm';
import { Job, JobInterval, JobStatus } from '../jobs/entities/job.entity';
import { SseService } from '../common/sse/sse.service';
import { HeapFeederService } from '../scheduler/heap-feeder.service';
import { DefaultJobHandler } from './default-job-handler';
import { DlqAlertHandler } from './handlers/dlq-alert.handler';
import { HandlersRegistry } from './handlers-registry';
import { JobLogger } from './job-logger.service';
import { WorkerService } from './worker.service';

const createJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  type: 'test_job',
  priority: 1,
  status: JobStatus.PENDING,
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: new Date('2026-06-09T10:00:00.000Z'),
  dependencyIds: [],
  inDlq: false,
  startedAt: null,
  createdAt: new Date('2026-06-09T10:00:00.000Z'),
  ...overrides,
});

describe('WorkerService', () => {
  let heapFeeder: jest.Mocked<HeapFeederService>;
  let jobsRepository: jest.Mocked<
    Pick<
      Repository<Job>,
      'createQueryBuilder' | 'update' | 'findBy' | 'save' | 'countBy'
    >
  >;
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let jobLogger: jest.Mocked<JobLogger>;
  let handlersRegistry: jest.Mocked<HandlersRegistry>;
  let defaultHandler: jest.Mocked<DefaultJobHandler>;
  let dlqAlertHandler: jest.Mocked<DlqAlertHandler>;
  let sseService: jest.Mocked<SseService>;
  let service: WorkerService;

  beforeEach(() => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    heapFeeder = {
      popNextJob: jest.fn(),
    } as unknown as jest.Mocked<HeapFeederService>;

    jobsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
      countBy: jest.fn(),
    };

    jobLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<JobLogger>;

    handlersRegistry = {
      get: jest.fn(),
      register: jest.fn(),
    } as unknown as jest.Mocked<HandlersRegistry>;

    defaultHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DefaultJobHandler>;

    dlqAlertHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DlqAlertHandler>;

    sseService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<SseService>;

    service = new WorkerService(
      heapFeeder,
      jobsRepository as unknown as Repository<Job>,
      jobLogger,
      handlersRegistry,
      defaultHandler,
      dlqAlertHandler,
      sseService,
    );
  });

  describe('tick', () => {
    it('does nothing when no job is available', async () => {
      heapFeeder.popNextJob.mockResolvedValue(undefined);

      await service.tick();

      expect(jobsRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(sseService.emit).not.toHaveBeenCalled();
    });

    it('does nothing when claim fails', async () => {
      heapFeeder.popNextJob.mockResolvedValue(createJob());
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      await service.tick();

      expect(jobLogger.log).not.toHaveBeenCalled();
      expect(sseService.emit).not.toHaveBeenCalled();
    });

    it('re-queues job when dependencies are not met', async () => {
      const job = createJob({
        id: 'job-deps',
        dependencyIds: ['dep-1'],
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      jobsRepository.findBy.mockResolvedValue([
        createJob({ id: 'dep-1', status: JobStatus.PENDING }),
      ]);

      await service.tick();

      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-deps',
        'dependency_not_met',
        expect.stringContaining('10000ms'),
      );
      expect(jobsRepository.update).toHaveBeenCalledWith('job-deps', {
        status: JobStatus.PENDING,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        scheduledAt: expect.any(Date),
        startedAt: null,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-deps',
        status: JobStatus.PROCESSING,
      });
      expect(sseService.emit).toHaveBeenCalledTimes(1);
    });

    it('completes a non-recurring job on success', async () => {
      const job = createJob({ id: 'job-success' });
      const handler = { execute: jest.fn().mockResolvedValue(undefined) };

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(handler);

      await service.tick();

      expect(handler.execute).toHaveBeenCalledWith(job);
      expect(jobsRepository.update).toHaveBeenCalledWith('job-success', {
        status: JobStatus.COMPLETED,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        completedAt: expect.any(Date),
      });
      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-success',
        'completed',
        expect.any(String),
      );
      expect(jobsRepository.save).not.toHaveBeenCalled();
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-success',
        status: JobStatus.PROCESSING,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-success',
        status: JobStatus.COMPLETED,
      });
      expect(sseService.emit).toHaveBeenCalledTimes(2);
    });

    it('creates next recurring job on completion', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const job = createJob({
        id: 'job-recurring',
        interval: JobInterval.EVERY_MINUTE,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      jobsRepository.save.mockResolvedValue({
        id: 'next-job',
        status: JobStatus.PENDING,
        type: 'test_job',
      } as Job);

      await service.tick();

      expect(jobsRepository.update).toHaveBeenCalledWith('job-recurring', {
        status: JobStatus.COMPLETED,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        completedAt: expect.any(Date),
      });
      expect(jobsRepository.save).toHaveBeenCalledWith({
        type: 'test_job',
        payload: undefined,
        priority: 1,
        maxRetries: 3,
        interval: JobInterval.EVERY_MINUTE,
        dependencyIds: [],
        scheduledAt: new Date(now + 60_000),
        status: JobStatus.PENDING,
        retryCount: 0,
      });
      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-recurring',
        'completed',
        expect.any(String),
      );
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-recurring',
        status: JobStatus.PROCESSING,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-recurring',
        status: JobStatus.COMPLETED,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_created', {
        jobId: 'next-job',
        status: JobStatus.PENDING,
        type: 'test_job',
      });
      expect(sseService.emit).toHaveBeenCalledTimes(3);
    });

    it('schedules a retry with backoff when handler fails', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const job = createJob({
        id: 'job-retry',
        retryCount: 0,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('oops'));

      await service.tick();

      expect(jobsRepository.update).toHaveBeenCalledWith('job-retry', {
        status: JobStatus.PENDING,
        startedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        scheduledAt: expect.any(Date),
        errorMessage: 'oops',
        retryCount: 1,
      });
      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-retry',
        'retry_scheduled',
        expect.stringContaining('oops'),
      );
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-retry',
        status: JobStatus.PROCESSING,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-retry',
        status: JobStatus.PENDING,
        retryCount: 1,
      });
      expect(sseService.emit).toHaveBeenCalledTimes(2);
    });

    it('marks job as failed when max retries exceeded', async () => {
      const job = createJob({
        id: 'job-failed',
        retryCount: 2,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('final error'));

      await service.tick();

      expect(jobsRepository.update).toHaveBeenCalledWith('job-failed', {
        status: JobStatus.FAILED,
        errorMessage: 'final error',
        inDlq: true,
        retryCount: 3,
      });
      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-failed',
        'failed',
        expect.stringContaining('final error'),
      );
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-failed',
        status: JobStatus.PROCESSING,
      });
      expect(sseService.emit).toHaveBeenCalledWith('job_updated', {
        jobId: 'job-failed',
        status: JobStatus.FAILED,
        inDlq: true,
      });
    });

    it('creates a dlq_alert job when DLQ count hits the threshold', async () => {
      const job = createJob({
        id: 'job-dlq-threshold',
        retryCount: 2,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('fail'));
      jobsRepository.countBy.mockResolvedValue(10);
      jobsRepository.save.mockResolvedValue({ id: 'alert-1' } as Job);

      await service.tick();

      expect(jobsRepository.save).toHaveBeenCalledWith({
        type: 'dlq_alert',
        payload: { dlqCount: 10 },
        priority: 0,
        status: JobStatus.PENDING,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        scheduledAt: expect.any(Date),
      });
      expect(jobLogger.log).toHaveBeenCalledWith(
        'job-dlq-threshold',
        'dlq_alert_triggered',
        expect.stringContaining('10'),
      );
      expect(sseService.emit).toHaveBeenCalledWith('dlq_alert', {
        dlqCount: 10,
        alertJobId: 'alert-1',
      });
    });

    it('creates a dlq_alert when DLQ count exceeds the threshold', async () => {
      const job = createJob({
        id: 'job-dlq-above',
        retryCount: 2,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('fail'));
      jobsRepository.countBy.mockResolvedValue(15);
      jobsRepository.save.mockResolvedValue({ id: 'alert-2' } as Job);

      await service.tick();

      expect(jobsRepository.save).toHaveBeenCalledWith({
        type: 'dlq_alert',
        payload: { dlqCount: 15 },
        priority: 0,
        status: JobStatus.PENDING,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        scheduledAt: expect.any(Date),
      });
    });

    it('respects cooldown and does not fire duplicate dlq alerts', async () => {
      const job = createJob({
        id: 'job-dlq-cooldown',
        retryCount: 2,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('fail'));
      jobsRepository.countBy.mockResolvedValue(10);
      jobsRepository.save.mockResolvedValue({ id: 'alert-1' } as Job);

      // First tick fires the alert
      await service.tick();
      expect(jobsRepository.save).toHaveBeenCalled();

      (jobsRepository.save as jest.Mock).mockClear();

      // Second tick immediately after should not fire (cooldown)
      await service.tick();

      const dlqAlertCalls = (
        jobsRepository.save as jest.Mock
      ).mock.calls.filter(
        (call: any[]) =>
          (call[0] as Record<string, unknown>)?.type === 'dlq_alert',
      );
      expect(dlqAlertCalls).toHaveLength(0);
    });

    it('does not create dlq_alert when DLQ count is below threshold', async () => {
      const job = createJob({
        id: 'job-dlq-below',
        retryCount: 2,
        maxRetries: 3,
      });

      heapFeeder.popNextJob.mockResolvedValue(job);
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      handlersRegistry.get.mockReturnValue(undefined);
      defaultHandler.execute.mockRejectedValue(new Error('fail'));
      jobsRepository.countBy.mockResolvedValue(5);

      await service.tick();

      const dlqAlertCalls = (
        jobsRepository.save as jest.Mock
      ).mock.calls.filter(
        (call: any[]) =>
          (call[0] as Record<string, unknown>)?.type === 'dlq_alert',
      );

      expect(dlqAlertCalls).toHaveLength(0);
      const dlqAlertEmits = (sseService.emit as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0] === 'dlq_alert',
      );

      expect(dlqAlertEmits).toHaveLength(0);
    });
  });
});
