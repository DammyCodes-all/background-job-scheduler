# Background Job Scheduler

A background job scheduler built with NestJS and PostgreSQL. Jobs arrive via REST API, get ordered by priority and time in an in-memory min-heap, and execute in a single recursive worker loop. It handles retry with backoff and jitter, DAG dependency resolution, starvation prevention, recurring jobs, a dead-letter queue with threshold alerting, and real-time SSE events.

## Quick Start

```bash
pnpm install

# Copy and edit environment variables
cp .env.example .env

# Run database migrations
pnpm migration:run

# Start (watch mode)
pnpm start:dev
```

The server starts on `http://localhost:3000`. The scheduler (heap feeder) and worker begin running immediately. No separate process needed.

## Tests

```bash
# Unit + integration tests
pnpm test
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full design document covering:

- Database schema (`jobs` + `job_logs` tables)
- Min-heap priority queue (three-level ordering: priority → scheduledAt → createdAt)
- Worker loop with pessimistic lock via `UPDATE ... WHERE status = pending`
- Retry backoff (1s → 5s → 25s with ±50% jitter, max 3 retries)
- DAG cycle detection (DFS at creation time) and dependency enforcement (10s re-queue)
- Starvation prevention (30s sweep, 2min threshold, priority boost by 1)
- Dead-letter queue (`inDlq` boolean flag, threshold alert at 10)
- Recurring jobs (new row inserted on completion)
- SSE events (`job_created`, `job_updated`, `dlq_alert`)
- Duplicate protection across worker instances

## API

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/jobs` | Create a job |
| `GET` | `/jobs` | List jobs with optional filters |
| `GET` | `/jobs/:id` | Get a job by ID |
| `PATCH` | `/jobs/:id` | Update a job |
| `DELETE` | `/jobs/:id` | Soft-delete a job |
| `PATCH` | `/jobs/:id/cancel` | Cancel a pending job |
| `GET` | `/jobs/dlq` | List dead-letter queue jobs |
| `POST` | `/jobs/:id/retry` | Retry a DLQ job (resets retry count) |

### SSE

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/jobs/stream` | SSE stream of job state changes |

Event types: `job_created`, `job_updated`, `dlq_alert`.

### Job payload

```json
{
  "type": "send_email",
  "payload": { "to": "user@example.com", "template": "welcome" },
  "priority": 1,
  "scheduledAt": "2026-06-10T12:00:00Z",
  "maxRetries": 3,
  "dependencyIds": ["uuid-of-another-job"],
  "interval": "daily"
}
```

## Adding a Job Handler

```typescript
import { Injectable } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { Job } from '../../jobs/entities/job.entity';

@Injectable()
export class SendEmailHandler implements JobHandler {
  async execute(job: Job): Promise<void> {
    // Your logic here
  }
}
```

Register it in `WorkerModule`:

```typescript
@Module({
  providers: [
    { provide: 'send_email', useClass: SendEmailHandler },
    // ...
  ],
})
export class WorkerModule {}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_NAME` | `background_job_scheduler` | PostgreSQL database |
