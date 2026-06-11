import { ApiProperty } from '@nestjs/swagger';

export class StatsResponseDto {
  @ApiProperty({ example: 42, description: 'Number of pending jobs' })
  pending!: number;

  @ApiProperty({ example: 3, description: 'Number of processing jobs' })
  processing!: number;

  @ApiProperty({ example: 156, description: 'Number of completed jobs' })
  completed!: number;

  @ApiProperty({ example: 12, description: 'Number of failed jobs' })
  failed!: number;

  @ApiProperty({ example: 8, description: 'Number of cancelled jobs' })
  cancelled!: number;

  @ApiProperty({
    example: 221,
    description: 'Total number of jobs across all statuses',
  })
  total!: number;
}
