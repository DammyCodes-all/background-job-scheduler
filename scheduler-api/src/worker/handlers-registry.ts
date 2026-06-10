import { Injectable } from '@nestjs/common';
import { JobHandler } from './interfaces/job-handler.interface';

@Injectable()
export class HandlersRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }
}
