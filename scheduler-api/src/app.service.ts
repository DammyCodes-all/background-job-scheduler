import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async health(): Promise<{ status: string; db: string; timestamp: string }> {
    let dbStatus = 'ok';

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error: unknown) {
      dbStatus = 'error';
      this.logger.error('Health check DB query failed', error);
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
