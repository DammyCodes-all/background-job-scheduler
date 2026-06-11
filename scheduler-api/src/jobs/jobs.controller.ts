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
import { PaginatedResultDto } from './dto/paginated-result.dto';
import { StatsResponseDto } from './dto/stats-response.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly sseService: SseService,
  ) {}

  @Sse('events')
  @ApiOperation({
    summary: 'Subscribe to job events via SSE',
    description:
      'Opens a Server-Sent Events stream. Emits job_created, job_updated, and dlq_alert events in real time. The browser EventSource API auto-reconnects on disconnect.',
  })
  jobEvents(): Observable<MessageEvent> {
    return this.sseService.events$;
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new job',
    description:
      'Creates a job with the given type, payload, priority, and optional scheduling. Validates dependencies for existence and DAG cycles. For recurring jobs, set interval to a non-null value.',
  })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully.',
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
  @ApiOperation({
    summary: 'Get all jobs (paginated)',
    description:
      'Returns a paginated list of all jobs ordered by createdAt DESC. Supports page and limit query parameters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of jobs.',
    type: PaginatedResultDto,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.jobsService.findAll(pagination);
  }

  @Get('dlq')
  @ApiOperation({
    summary: 'List jobs in the dead-letter queue (paginated)',
    description:
      'Returns a paginated list of jobs that have exhausted their retries (inDlq = true). Ordered by createdAt DESC.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of DLQ jobs.',
    type: PaginatedResultDto,
  })
  findDlq(@Query() pagination: PaginationDto) {
    return this.jobsService.findDlq(pagination);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get job status counts',
    description:
      'Returns aggregate counts for each status (pending, processing, completed, failed, cancelled) and a total.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status counts.',
    type: StatsResponseDto,
  })
  stats() {
    return this.jobsService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a job by ID',
    description:
      'Returns a single job with all fields including payload, errorMessage, and timestamps.',
  })
  @ApiResponse({ status: 200, description: 'The requested job.', type: Job })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a job',
    description:
      'Updates one or more fields on an existing job. Supports updating type, payload, priority, maxRetries, scheduledAt, interval, and dependency_ids. The status field is not supported, it will be ignored. All status changes are managed internally by the worker. Validates dependency DAG on change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Job updated successfully.',
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
  @ApiOperation({
    summary: 'Cancel a pending job',
    description:
      'Cancels a job that is still in pending status. Processing or already-completed jobs cannot be cancelled. Emits a job_updated SSE event.',
  })
  @ApiResponse({
    status: 200,
    description: 'Job cancelled successfully.',
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
  @ApiOperation({
    summary: 'Delete a job',
    description:
      'Permanently removes a job and its associated logs (CASCADE). Processing jobs cannot be deleted. Completed, failed, cancelled, and pending jobs can be safely removed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Job deleted successfully.',
  })
  @ApiBadRequestResponse({ description: 'Processing jobs cannot be removed.' })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Retry a job from the dead-letter queue',
    description:
      'Resets a DLQ job back to pending with retryCount = 0, clears the errorMessage, and sets scheduledAt to now. The job re-enters the normal scheduling pipeline.',
  })
  @ApiResponse({
    status: 200,
    description: 'Job requeued successfully.',
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
