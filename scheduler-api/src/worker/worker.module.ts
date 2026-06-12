import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/entities/job.entity';
import { JobLog } from '../jobs/entities/job-logs.entity';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { DefaultJobHandler } from './default-job-handler';
import { DlqAlertHandler } from './handlers/dlq-alert.handler';
import { EmailHandler } from './handlers/email.handler';
import { HandlersRegistry } from './handlers-registry';
import { JobLogger } from './job-logger.service';
import { StuckProcessingSweeperService } from './stuck-processing-sweeper.service';
import { WorkerService } from './worker.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobLog]), SchedulerModule],
  providers: [
    WorkerService,
    HandlersRegistry,
    DefaultJobHandler,
    DlqAlertHandler,
    EmailHandler,
    JobLogger,
    StuckProcessingSweeperService,
  ],
})
export class WorkerModule {}
