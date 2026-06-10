import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SseService } from '../common/sse/sse.service';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly sseService: SseService,
  ) {}

  @Sse('events')
  @ApiOperation({ summary: 'Subscribe to job events via SSE' })
  jobEvents(): Observable<MessageEvent> {
    return this.sseService.events$;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({
    status: 201,
    description: 'The job has been successfully created.',
    type: Job,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input data, dependency cycle detected, or dependencies do not exist.',
  })
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated jobs.',
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.jobsService.findAll(pagination);
  }

  @Get('dlq')
  @ApiOperation({ summary: 'List jobs in the dead-letter queue (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated DLQ jobs.',
  })
  findDlq(@Query() pagination: PaginationDto) {
    return this.jobsService.findDlq(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by id' })
  @ApiResponse({ status: 200, description: 'Return a single job.', type: Job })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully updated.',
    type: Job,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input data, dependency cycle detected, or dependencies do not exist.',
  })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.update(id, updateJobDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been cancelled.',
    type: Job,
  })
  @ApiBadRequestResponse({
    description: 'Only pending jobs can be cancelled.',
  })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  cancel(@Param('id') id: string) {
    return this.jobsService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully deleted.',
  })
  @ApiBadRequestResponse({ description: 'Processing jobs cannot be removed.' })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a job from the dead-letter queue' })
  @ApiResponse({
    status: 200,
    description: 'The job has been requeued.',
    type: Job,
  })
  @ApiBadRequestResponse({
    description: 'Job is not in the dead-letter queue.',
  })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  retry(@Param('id') id: string) {
    return this.jobsService.retryFromDlq(id);
  }
}
