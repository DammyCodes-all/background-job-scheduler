import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobLog } from '../jobs/entities/job-logs.entity';

@Injectable()
export class JobLogger {
  constructor(
    @InjectRepository(JobLog)
    private readonly jobLogRepository: Repository<JobLog>,
  ) {}

  async log(jobId: string, event: string, message?: string): Promise<void> {
    await this.jobLogRepository.save({ jobId, event, message });
  }
}
