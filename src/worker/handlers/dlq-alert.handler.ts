import { Logger } from '@nestjs/common';
import { Job } from '../../jobs/entities/job.entity';
import { JobHandler } from '../interfaces/job-handler.interface';

export class DlqAlertHandler implements JobHandler {
  private readonly logger = new Logger(DlqAlertHandler.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(job: Job): Promise<void> {
    const dlqCount: number =
      (job.payload as { dlqCount: number } | undefined)?.dlqCount ?? 0;

    this.logger.warn(
      `DLQ threshold crossed: ${dlqCount} jobs in dead-letter queue`,
    );
  }
}
