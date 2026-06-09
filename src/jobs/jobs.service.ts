import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const dependencyIds = await this.validateDependencyIds(
      createJobDto.dependencyIds,
    );

    const job = this.jobsRepository.create({
      ...createJobDto,
      dependencyIds,
    });
    return this.jobsRepository.save(job);
  }

  findAll(): Promise<Job[]> {
    return this.jobsRepository.find();
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
