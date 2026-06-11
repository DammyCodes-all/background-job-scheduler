import { Logger } from '@nestjs/common';
import { Job } from '../../jobs/entities/job.entity';
import { JobHandler } from '../interfaces/job-handler.interface';

const ERROR_RATE = 0.2;
const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5_000;

export class EmailHandler implements JobHandler {
  private readonly logger = new Logger(EmailHandler.name);

  async execute(job: Job): Promise<void> {
    const payload = job.payload as Record<string, unknown> | undefined;

    if (!payload || typeof payload !== 'object') {
      throw new Error('Email payload is required');
    }

    const { to, subject, body } = payload as {
      to?: unknown;
      subject?: unknown;
      body?: unknown;
    };

    if (!to || typeof to !== 'string' || !to.trim()) {
      throw new Error('Email payload must include a valid "to" field');
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      throw new Error('Email payload must include a valid "subject" field');
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      throw new Error('Email payload must include a valid "body" field');
    }

    this.logger.log(`Sending email to "${to}" with subject "${subject}"`);

    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (Math.random() < ERROR_RATE) {
      throw new Error(
        `Email provider failed to send to "${to}" — temporary service error`,
      );
    }

    this.logger.log(
      `Email sent successfully to "${to}" (${Math.round(delay)}ms)`,
    );
  }
}
