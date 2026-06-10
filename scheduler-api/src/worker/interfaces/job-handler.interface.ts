import { Job } from '../../jobs/entities/job.entity';

export interface JobHandler {
  execute(job: Job): Promise<void>;
}
