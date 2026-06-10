# Background Job Scheduler

A full-stack background job scheduler with priority queuing, retry logic, a dead-letter queue, and real-time SSE updates.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 11, TypeORM 0.3, PostgreSQL |
| **Frontend** | React 19, Vite 8, TanStack Router, TanStack Query, shadcn/ui |
| **State** | Zustand (frontend), RxJS SSE Subject (backend) |
| **Icons** | Hugeicons |
| **Styling** | Tailwind CSS v4, OKLCH theme |

## Architecture

> Full architecture docs: [`scheduler-api/docs/architecture.md`](scheduler-api/docs/architecture.md)
> Frontend integration guide: [`scheduler-api/docs/frontend-integration.md`](scheduler-api/docs/frontend-integration.md)

```
Client (SSE) ← → NestJS API ← → PostgreSQL
                    ↕
      ┌───────────────────────────┐
      │  HeapFeeder (500ms poll)  │
      │       ↓                   │
      │  Min-Heap (priority→scheduledAt→createdAt)
      │       ↓                   │
      │  Worker (recursive tick)  │
      │  - pessimistic lock       │
      │  - dependency check       │
      │  - handler execution      │
      │  - retry/backoff/jitter   │
      │  - DLQ on exhaustion      │
      └───────────────────────────┘
```

- **Priority queue**: In-memory min-heap, sorted by `priority ASC → scheduledAt ASC → createdAt ASC`
- **Scheduler**: Polls DB every 500ms, feeds pending jobs into the heap
- **Worker**: Recursive `setTimeout` loop (≥1s gap), claims via `UPDATE … WHERE status='pending'` (pessimistic row lock), executes registered handler, handles retry/backoff/DLQ
- **Starvation prevention**: Sweep every 30s, boosts priority of jobs waiting >2min
- **DLQ alert**: SSE event emitted when ≥10 DLQ entries accumulate (1h cooldown)
- **SSE**: RxJS `Subject`, auto-reconnecting `EventSource` on the frontend

## Quick Start

### Prerequisites

- Node.js ≥20
- pnpm
- PostgreSQL running on localhost:5432

### Setup

```sh
# Backend
cd scheduler-api
pnpm install
cp .env.example .env
# edit .env with your DB credentials
pnpm migration:run
pnpm start:dev

# Frontend (in another terminal)
cd frontend
pnpm install
pnpm dev
```

The API starts on port 3000, the frontend on port 5173. CORS is pre-configured for `localhost:5173`.

## API Reference

Base URL: `http://localhost:3000`

### Health

```
GET /health
→ { status: "ok", db: true, timestamp: "…" }
GET /
→ "Hello World!"
```

### Jobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/jobs` | List jobs (paginated, newest first) |
| `GET` | `/jobs/dlq` | List dead-letter queue jobs |
| `GET` | `/jobs/:id` | Get single job |
| `POST` | `/jobs` | Create a job |
| `PATCH` | `/jobs/:id` | Update a job |
| `PATCH` | `/jobs/:id/cancel` | Cancel a pending job |
| `DELETE` | `/jobs/:id` | Delete a job (not processing) |
| `POST` | `/jobs/:id/retry` | Retry a DLQ job |
| `GET` | `/jobs/events` | SSE stream of job state changes |

### SSE Events

| Event | Payload | Trigger |
|---|---|---|
| `job_created` | `{ jobId, type, status }` | New job created |
| `job_updated` | `{ jobId, type, status }` | Status change (processing, completed, failed, etc.) |
| `dlq_alert` | `{ alertJobId }` | DLQ count ≥10 (1h cooldown) |

### Pagination

```
GET /jobs?page=1&limit=20
→ { data: Job[], total: number, page: number, limit: number, totalPages: number }
```

### Job Entity

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated |
| `type` | string | Maps to a registered `JobHandler` |
| `payload` | jsonb | Arbitrary data passed to the handler |
| `priority` | int | 1 (highest) — default 1 |
| `status` | enum | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `retryCount` | int | Current retry attempt |
| `maxRetries` | int | Default 3 |
| `scheduledAt` | timestamptz | When to execute |
| `interval` | string? | `every_1_minute`, `every_5_minutes`, …, `daily`, `weekly`, `monthly` |
| `dependencyIds` | UUID[] | Jobs that must complete first |
| `errorMessage` | text? | Last failure reason |
| `inDlq` | boolean | True when retries exhausted |
| `createdAt` | timestamptz | |
| `startedAt` | timestamptz? | |
| `completedAt` | timestamptz? | |
| `lastPriorityBoostedAt` | timestamptz? | Starvation prevention |

### Create Job

```json
POST /jobs
{
  "type": "email_notification",
  "payload": { "to": "user@example.com", "subject": "Hello" },
  "priority": 1,
  "maxRetries": 3,
  "scheduledAt": "2026-06-10T12:00:00Z",
  "interval": "hourly",
  "dependency_ids": ["<uuid>"]
}
```

## Frontend Routes

| Path | View | Features |
|---|---|---|
| `/` | Dashboard | Status breakdown cards with count + progress bars |
| `/jobs` | Jobs | Paginated table, search by type, filter by status, cancel/delete actions, row-flash on SSE update |
| `/dlq` | DLQ | Paginated table, search by type/error, inline error expansion, two-click retry confirmation, alert banner at ≥10 |

### Job Creation (sidebar)

A slide-over Sheet (`/jobs/new`) with:
- Type + priority segmented controls
- Max retries, interval, scheduledAt picker
- Dependency ID chip input
- JSON payload editor (`@uiw/react-textarea-code-editor` with dark mode)

## Adding a Job Handler

```typescript
// scheduler-api/src/worker/handlers/your-handler.ts
import { JobHandler } from './handlers-registry';

export class YourHandler implements JobHandler {
  async execute(job: Job): Promise<void> {
    // your business logic here
  }
}
```

Then register it in the module:

```typescript
// scheduler-api/src/worker/worker.module.ts or a dedicated handler module
handlersRegistry.register('your_type', new YourHandler());
```

Jobs created with `type: "your_type"` will automatically be routed to this handler.

## Environment Variables

### Backend (`scheduler-api/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Environment |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | DB user |
| `DB_PASSWORD` | `postgres` | DB password |
| `DB_NAME` | `background_job_scheduler` | DB name |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend API base URL |

## Development Scripts

### Backend

```sh
pnpm start:dev          # Watch mode
pnpm test               # Unit tests
pnpm test:e2e           # E2E tests
pnpm test:cov           # Coverage
pnpm migration:run      # Apply migrations
pnpm migration:generate # Generate migration from entity changes
pnpm migration:revert   # Roll back last migration
pnpm db:clear           # Truncate all jobs
```

### Frontend

```sh
pnpm dev     # Dev server (Vite)
pnpm build   # TypeScript check + production build
pnpm lint    # ESLint
pnpm preview # Preview production build
```

## Project Structure

```
background-job-scheduler/
├── scheduler-api/                  # NestJS backend
│   ├── src/
│   │   ├── main.ts                 # Entry point, CORS, Swagger
│   │   ├── app.module.ts           # Root module
│   │   ├── config/                 # Env validation
│   │   ├── common/                 # SSE service, exception filter, pagination type
│   │   ├── jobs/                   # Jobs controller, service, DTOs, entity
│   │   ├── scheduler/              # HeapFeeder, JobPriorityHeap
│   │   └── worker/                 # Worker loop, handlers registry, backoff
│   ├── database/                   # DataSource, migrations
│   └── docs/                       # Architecture docs
│
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── main.tsx                # App entry, QueryClient
│   │   ├── router.tsx              # TanStack Router
│   │   ├── lib/api.ts              # API client + types
│   │   ├── hooks/                  # TanStack Query hooks + SSE hook
│   │   ├── stores/                 # Zustand store (SSE state, flash IDs)
│   │   ├── routes/                 # Page components
│   │   ├── components/             # Sidebar, create-job dialog
│   │   └── index.css               # Tailwind v4 + shadcn theme
│   └── components.json             # shadcn/ui config
│
└── README.md                       # This file
```
