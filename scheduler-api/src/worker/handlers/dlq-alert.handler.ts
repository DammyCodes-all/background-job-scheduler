import { Logger } from '@nestjs/common';
import { Job } from '../../jobs/entities/job.entity';
import { JobHandler } from '../interfaces/job-handler.interface';

export class DlqAlertHandler implements JobHandler {
  private readonly logger = new Logger(DlqAlertHandler.name);

  async execute(job: Job): Promise<void> {
    const dlqCount: number =
      (job.payload as { dlqCount: number } | undefined)?.dlqCount ?? 0;

    this.logger.warn(
      `DLQ threshold crossed: ${dlqCount} jobs in dead-letter queue`,
    );

    await this.sendAlertEmail(dlqCount);
  }

  private async sendAlertEmail(dlqCount: number): Promise<void> {
    const latency = 500 + Math.random() * 2000;

    this.logger.log(
      `Sending DLQ alert email (${dlqCount} jobs) — simulating ${Math.round(latency)}ms SMTP call...`,
    );

    await new Promise((resolve) => setTimeout(resolve, latency));

    this.logger.log(
      `DLQ alert email sent successfully to admin@dilamme.com (${dlqCount} jobs in DLQ)`,
    );
  }
}
