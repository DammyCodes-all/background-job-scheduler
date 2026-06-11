export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type JobInterval =
  | 'every_1_minute'
  | 'every_5_minutes'
  | 'every_15_minutes'
  | 'every_30_minutes'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'

export interface Job {
  id: string
  type: string
  payload: Record<string, unknown> | null
  priority: number
  status: JobStatus
  retryCount: number
  maxRetries: number
  scheduledAt: string
  interval: JobInterval | null
  dependencyIds: string[]
  errorMessage: string | null
  inDlq: boolean
  createdAt: string
  lastPriorityBoostedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateJobDto {
  type: string
  payload?: Record<string, unknown>
  priority?: number
  maxRetries?: number
  scheduledAt?: string
  interval?: JobInterval
  dependency_ids?: string[]
}

export interface UpdateJobDto {
  type?: string
  payload?: Record<string, unknown>
  priority?: number
  maxRetries?: number
  scheduledAt?: string
  interval?: JobInterval
  dependency_ids?: string[]
  status?: JobStatus
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  db: 'ok' | 'error'
  timestamp: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  listJobs: (page = 1, limit = 20) =>
    request<PaginatedResult<Job>>(`/jobs?page=${page}&limit=${limit}`),

  getJob: (id: string) => request<Job>(`/jobs/${id}`),

  createJob: (dto: CreateJobDto) =>
    request<Job>('/jobs', { method: 'POST', body: JSON.stringify(dto) }),

  updateJob: (id: string, dto: UpdateJobDto) =>
    request<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  cancelJob: (id: string) =>
    request<Job>(`/jobs/${id}/cancel`, { method: 'PATCH' }),

  deleteJob: (id: string) =>
    request<void>(`/jobs/${id}`, { method: 'DELETE' }),

  listDlq: (page = 1, limit = 20) =>
    request<PaginatedResult<Job>>(`/jobs/dlq?page=${page}&limit=${limit}`),

  retryJob: (id: string) =>
    request<Job>(`/jobs/${id}/retry`, { method: 'POST' }),

  getJobStats: () =>
    request<Record<string, number>>('/jobs/stats'),
}

export type SseEventType = 'job_created' | 'job_updated' | 'dlq_alert'

export interface SseEventPayload {
  job_created: { jobId: string; status: string; type: string; priority: number }
  job_updated: { jobId: string; status: string; retryCount?: number; inDlq?: boolean }
  dlq_alert: { dlqCount: number; alertJobId: string }
}

export type SseCallback = <T extends SseEventType>(
  event: T,
  data: SseEventPayload[T],
) => void
