import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobInterval {
  EVERY_MINUTE = 'every_1_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_30_MINUTES = 'every_30_minutes',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('jobs')
@Index('IDX_JOBS_PENDING', ['status', 'scheduledAt', 'priority'], {
  where: "status = 'pending'",
})
export class Job {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the job',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 'send_email',
    description: 'The name or type of the job',
  })
  @Column({ type: 'varchar' })
  type!: string;

  @ApiProperty({
    example: { to: 'user@example.com' },
    description: 'The payload/data for the job',
  })
  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, any>;

  @ApiProperty({
    example: 1,
    description: 'Priority of the job (Heap ordering. 1 beats 2 beats 3)',
  })
  @Column({ type: 'int', default: 1 })
  priority!: number;

  @ApiProperty({
    enum: JobStatus,
    example: JobStatus.PENDING,
    description: 'The current status of the job',
  })
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status!: JobStatus;

  @ApiProperty({
    example: 0,
    description: "How many times we've attempted.",
  })
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @ApiProperty({
    example: 3,
    description: 'Defaults to 3. Lets you configure per-job if needed',
  })
  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  @ApiProperty({
    description: 'Scheduler only picks up jobs where this is in the past.',
  })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  scheduledAt!: Date;

  @ApiProperty({
    enum: JobInterval,
    example: JobInterval.EVERY_MINUTE,
    description: 'Null means one-shot. Non-null means recurring',
  })
  @Column({ type: 'varchar', nullable: true })
  interval?: JobInterval;

  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description:
      'Array of job IDs that must be completed before this job can run',
  })
  @Column({ type: 'uuid', array: true, default: [] })
  dependencyIds!: string[];

  @ApiProperty({
    example: 'Connection timeout',
    description: 'Last failure reason. Visible in DLQ view',
  })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({
    example: false,
    description: 'Flag that separates dead jobs from the normal queue',
  })
  @Column({ type: 'boolean', default: false })
  inDlq!: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({
    description: 'When worker picked it up. Useful for detecting stuck jobs',
  })
  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @ApiProperty({
    description: 'When it finished. Dashboard metrics, audit trail',
  })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
