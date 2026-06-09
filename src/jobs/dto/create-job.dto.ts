import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  IsDateString,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
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
  @IsDateString()
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
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Job dependencies',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  dependencyIds?: string[];
}
