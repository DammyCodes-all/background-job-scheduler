import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { JobStatus } from '../entities/job.entity';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({ enum: JobStatus, description: 'Update job status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
