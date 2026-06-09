import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
  ) {}

  create(createJobDto: Partial<Job>): Promise<Job> {
    const job = this.jobsRepository.create(createJobDto);
    return this.jobsRepository.save(job);
  }

  findAll(): Promise<Job[]> {
    return this.jobsRepository.find();
  }

  findOne(id: string): Promise<Job | null> {
    return this.jobsRepository.findOneBy({ id });
  }
}
