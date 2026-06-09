import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Job } from './job.entity';

@Entity('job_logs')
export class JobLog {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the job log',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the associated job',
  })
  @Column({ type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @ApiProperty({
    example: 'job_started',
    description:
      'The type of event that occurred (e.g., job_created, retry_attempted)',
  })
  @Column({ type: 'varchar' })
  event!: string;

  @ApiProperty({
    example: 'Job processing started by worker-1',
    description:
      'Human-readable detail about the event. Error message, payload summary, etc.',
  })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @ApiProperty({
    description: 'When this event happened',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
