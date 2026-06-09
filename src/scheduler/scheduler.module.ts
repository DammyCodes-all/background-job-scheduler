import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/entities/job.entity';
import { HeapFeederService } from './heap-feeder.service';
import { JobPriorityHeap } from './job-priority-heap';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [HeapFeederService, JobPriorityHeap],
  exports: [HeapFeederService, JobPriorityHeap],
})
export class SchedulerModule {}
