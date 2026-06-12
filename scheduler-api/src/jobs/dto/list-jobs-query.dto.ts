import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '../entities/job.entity';
import { PaginationDto } from './pagination.dto';

export class ListJobsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: JobStatus,
    description: 'Filter jobs by status',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    example: 'send_email',
    description: 'Case-insensitive partial match against the job type',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    example: 'email',
    description: 'Case-insensitive partial search against the job type',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
