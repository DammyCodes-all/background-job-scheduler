import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { JobsService } from './jobs.service';

type MockRepository = {
  countBy: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
};

const createRepository = (): MockRepository => ({
  countBy: jest.fn(),
  create: jest.fn((job: Partial<Job>) => job),
  delete: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn((job: Partial<Job>) =>
    Promise.resolve({ id: 'job-1', ...job }),
  ),
  update: jest.fn(),
});

const createService = (repository: MockRepository): JobsService =>
  new JobsService(repository as unknown as Repository<Job>);

describe('JobsService', () => {
  it('deduplicates and validates dependencies before creating a job', async () => {
    const repository = createRepository();
    repository.countBy.mockResolvedValue(1);
    repository.findOne.mockResolvedValue({ dependencyIds: [] });
    const service = createService(repository);

    await service.create({
      type: 'send_email',
      dependencyIds: ['dep-1', 'dep-1'],
    });

    expect(repository.create).toHaveBeenCalledWith({
      type: 'send_email',
      dependencyIds: ['dep-1'],
    });
  });

  it('rejects create when a dependency does not exist', async () => {
    const repository = createRepository();
    repository.countBy.mockResolvedValue(0);
    const service = createService(repository);

    await expect(
      service.create({ type: 'send_email', dependencyIds: ['missing-dep'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects update when the proposed dependencies point back to the target job', async () => {
    const repository = createRepository();
    repository.findOneBy.mockResolvedValue({ id: 'job-1' });
    repository.countBy.mockResolvedValue(1);
    repository.findOne.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'dep-1'
            ? { dependencyIds: ['job-1'] }
            : { dependencyIds: [] },
        ),
    );
    const service = createService(repository);

    await expect(
      service.update('job-1', { dependencyIds: ['dep-1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects update when a job depends directly on itself', async () => {
    const repository = createRepository();
    repository.findOneBy.mockResolvedValue({ id: 'job-1' });
    const service = createService(repository);

    await expect(
      service.update('job-1', { dependencyIds: ['job-1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws not found when updating a missing job', async () => {
    const repository = createRepository();
    repository.findOneBy.mockResolvedValue(null);
    const service = createService(repository);

    await expect(
      service.update('missing-job', { priority: 2 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects remove when a job is processing', async () => {
    const repository = createRepository();
    repository.findOneBy.mockResolvedValue({
      id: 'job-1',
      status: JobStatus.PROCESSING,
    });
    const service = createService(repository);

    await expect(service.remove('job-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('removes a job when it is not processing', async () => {
    const repository = createRepository();
    repository.findOneBy.mockResolvedValue({
      id: 'job-1',
      status: JobStatus.PENDING,
    });
    repository.delete.mockResolvedValue({ affected: 1 });
    const service = createService(repository);

    await expect(service.remove('job-1')).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith('job-1');
  });
});
