import { ApiProperty } from '@nestjs/swagger';
import { Job } from '../entities/job.entity';

export class PaginatedResultDto {
  @ApiProperty({ type: Job, isArray: true, description: 'Array of jobs' })
  data!: Job[];

  @ApiProperty({ example: 147, description: 'Total number of matching jobs' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page (1-indexed)' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit!: number;

  @ApiProperty({ example: 8, description: 'Total number of pages' })
  totalPages!: number;
}
