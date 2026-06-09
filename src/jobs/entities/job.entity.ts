import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('jobs')
export class Job {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the job',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'send_email',
    description: 'The name or type of the job',
  })
  @Column()
  type: string;

  @ApiProperty({
    example: { to: 'user@example.com' },
    description: 'The payload/data for the job',
  })
  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @ApiProperty({
    example: 'pending',
    description: 'The current status of the job',
  })
  @Column({ default: 'pending' })
  status: string;

  @ApiProperty({
    example: 1,
    description: 'Priority of the job (higher number means higher priority)',
  })
  @Column({ default: 0 })
  priority: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
