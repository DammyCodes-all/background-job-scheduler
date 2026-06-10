import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SseService } from '../common/sse/sse.service';
import { PaginatedResult } from '../common/types/paginated-result';
import { Job, JobStatus } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    private readonly sseService: SseService,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const dependencyIds = await this.validateDependencyIds(
      createJobDto.dependencyIds,
    );

    const job = this.jobsRepository.create({
      ...createJobDto,
      dependencyIds,
    });
    const saved = await this.jobsRepository.save(job);

    this.sseService.emit('job_created', {
      jobId: saved.id,
      status: saved.status,
      type: saved.type,
      priority: saved.priority,
    });

    return saved;
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Job>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.jobsRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findDlq(pagination: PaginationDto): Promise<PaginatedResult<Job>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.jobsRepository.findAndCount({
      where: { inDlq: true },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async retryFromDlq(id: string): Promise<Job> {
    const job = await this.findOne(id);

    if (!job.inDlq) {
      throw new BadRequestException('Job is not in the dead-letter queue');
    }

    await this.jobsRepository.update(id, {
      status: JobStatus.PENDING,
      inDlq: false,
      retryCount: 0,
      errorMessage: null as unknown as undefined,
      scheduledAt: new Date(),
    });

    this.sseService.emit('job_updated', {
      jobId: id,
      status: JobStatus.PENDING,
    });

    return this.findOne(id);
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobsRepository.findOneBy({ id });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    await this.findOne(id);

    const dependencyIds =
      updateJobDto.dependencyIds === undefined
        ? undefined
        : await this.validateDependencyIds(updateJobDto.dependencyIds, id);

    await this.jobsRepository.update(id, {
      ...updateJobDto,
      ...(dependencyIds === undefined ? {} : { dependencyIds }),
    });

    if (updateJobDto.status === JobStatus.CANCELLED) {
      this.sseService.emit('job_updated', {
        jobId: id,
        status: JobStatus.CANCELLED,
      });
    }

    return this.findOne(id);
  }

  async cancel(id: string): Promise<Job> {
    const job = await this.findOne(id);

    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel job with status ${job.status}. Only pending jobs can be cancelled.`,
      );
    }

    await this.jobsRepository.update(id, {
      status: JobStatus.CANCELLED,
    });
    this.sseService.emit('job_updated', {
      jobId: id,
      status: JobStatus.CANCELLED,
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);

    if (job.status === JobStatus.PROCESSING) {
      throw new BadRequestException('Processing jobs cannot be removed');
    }

    const result = await this.jobsRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Job ${id} not found`);
    }
  }

  private async validateDependencyIds(
    dependencyIds: string[] | undefined,
    targetId?: string,
  ): Promise<string[]> {
    const uniqueDependencyIds = [...new Set(dependencyIds ?? [])];

    if (uniqueDependencyIds.length === 0) {
      return [];
    }

    if (targetId && uniqueDependencyIds.includes(targetId)) {
      throw new BadRequestException('A job cannot depend on itself');
    }

    const depsCount = await this.jobsRepository.countBy({
      id: In(uniqueDependencyIds),
    });

    if (depsCount !== uniqueDependencyIds.length) {
      throw new BadRequestException('One or more dependency_ids do not exist');
    }

    if (await this.detectCycle(targetId, uniqueDependencyIds)) {
      throw new BadRequestException(
        'Cycle detected in job dependencies (DAG validation failed)',
      );
    }

    return uniqueDependencyIds;
  }

  private async detectCycle(
    targetId: string | undefined,
    dependencyIds: string[],
  ): Promise<boolean> {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    for (const dependencyId of dependencyIds) {
      if (
        await this.visitDependency(dependencyId, targetId, visited, visiting)
      ) {
        return true;
      }
    }

    return false;
  }

  private async visitDependency(
    jobId: string,
    targetId: string | undefined,
    visited: Set<string>,
    visiting: Set<string>,
  ): Promise<boolean> {
    if (jobId === targetId || visiting.has(jobId)) {
      return true;
    }

    if (visited.has(jobId)) {
      return false;
    }

    visiting.add(jobId);

    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
      select: ['dependencyIds'],
    });

    for (const dependencyId of job?.dependencyIds ?? []) {
      if (
        await this.visitDependency(dependencyId, targetId, visited, visiting)
      ) {
        return true;
      }
    }

    visiting.delete(jobId);
    visited.add(jobId);

    return false;
  }
}
