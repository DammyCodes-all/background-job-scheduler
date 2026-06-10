import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  IsDate,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobInterval } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ example: 'send_email', description: 'The type of job to run' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({
    example: { to: 'user@example.com' },
    description: 'Payload data',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ example: 1, description: 'Priority of the job' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: 3, description: 'Max retries' })
  @IsOptional()
  @IsInt()
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Scheduled execution time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({
    enum: JobInterval,
    example: JobInterval.EVERY_MINUTE,
    description: 'Recurring interval',
  })
  @IsOptional()
  @IsEnum(JobInterval)
  interval?: JobInterval;

  @ApiPropertyOptional({
    name: 'dependency_ids',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'The ids of this job dependencies',
  })
  @IsOptional()
  @Expose({ name: 'dependency_ids' })
  @IsArray()
  @IsUUID('all', { each: true })
  dependencyIds?: string[];
}
