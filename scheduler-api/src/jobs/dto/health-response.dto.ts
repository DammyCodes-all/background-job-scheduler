import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Overall service status' })
  status!: string;

  @ApiProperty({ example: 'ok', description: 'Database connectivity status' })
  db!: string;

  @ApiProperty({
    example: '2026-06-11T12:00:00.000Z',
    description: 'Current server timestamp',
  })
  timestamp!: string;
}
