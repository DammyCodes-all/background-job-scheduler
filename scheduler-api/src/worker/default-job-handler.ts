import { Logger } from '@nestjs/common';
import { Job } from '../jobs/entities/job.entity';
import { JobHandler } from './interfaces/job-handler.interface';

export class DefaultJobHandler implements JobHandler {
  private readonly logger = new Logger(DefaultJobHandler.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(job: Job): Promise<void> {
    this.logger.log(`Handling job ${job.id} of type "${job.type}"`);
  }
}
