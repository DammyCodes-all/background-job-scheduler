/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useJobsQuery, useCancelJobMutation, useDeleteJobMutation } from '@/hooks/useJobQueries'
import { useJobStore } from '@/stores/jobStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Delete01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/lib/api'

export const Route = createFileRoute('/jobs')({
  component: JobsPage,
})

const ALL_STATUSES: (JobStatus | 'all')[] = [
  'all', 'pending', 'processing', 'completed', 'failed', 'cancelled',
]

const statusBadge: Record<string, string> = {
  pending:    'bg-status-pending/10 text-status-pending border-status-pending/20',
  processing: 'bg-status-processing/10 text-status-processing border-status-processing/20',
  completed:  'bg-status-completed/10 text-status-completed border-status-completed/20',
  failed:     'bg-status-failed/10 text-status-failed border-status-failed/20',
  cancelled:  'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
}

function priorityColor(p: number): string {
  if (p <= 1) return 'text-status-failed'
  if (p <= 3) return 'text-status-pending'
  return 'text-status-completed'
}

function intervalLabel(interval: string | null): string {
  if (!interval) return '\u2014'
  return interval.replace(/_/g, ' ')
}

function relTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function fmtExact(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm:ss')
}

function JobsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const flashingIds = useJobStore((s) => s.flashingIds)
  const { data, isLoading } = useJobsQuery(page)
  const cancelJob = useCancelJobMutation()
  const deleteJob = useDeleteJobMutation()

  const allJobs = useMemo(() => data?.data ?? [], [data?.data])
  const totalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data?.total ?? 0 }
    for (const s of ALL_STATUSES) {
      if (s !== 'all') {
        counts[s] = allJobs.filter((j) => j.status === s).length
      }
    }
    return counts
  }, [allJobs, data?.total])

  const filtered = useMemo(() => {
    return allJobs
      .filter((job) => statusFilter === 'all' || job.status === statusFilter)
      .filter((job) => !search || job.type.toLowerCase().includes(search.toLowerCase()))
  }, [allJobs, statusFilter, search])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Jobs</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {filtered.length === allJobs.length
              ? `${data?.total ?? 0} total`
              : `${filtered.length} of ${data?.total ?? 0}`}{' '}
            &mdash; page {page} of {data?.totalPages ?? 1}
          </p>
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
          )}
          {(data?.totalPages ?? 1) > page && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {ALL_STATUSES.map((s) => {
            const active = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-accent text-white'
                    : 'bg-bg-subtle text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                )}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-text-muted')}>
                  {totalCounts[s]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative ml-auto w-52">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder={'Search by type\u2026'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border-base bg-bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">ID</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Type</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Priority</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Status</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Retries</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Interval</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Created</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Scheduled</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Started</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Completed</TableHead>
              <TableHead className="w-24 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((job) => (
              <TableRow
                key={job.id}
                className={cn(
                  'hover:bg-bg-elevated data-[state=selected]:bg-bg-elevated',
                  flashingIds.includes(job.id) && 'animate-row-flash',
                )}
              >
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono text-[11px] text-text-muted cursor-default">
                        {job.id.slice(0, 8)}{'\u2026'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      <span className="font-mono text-[11px]">{job.id}</span>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-medium text-text-primary">{job.type}</TableCell>
                <TableCell>
                  <span className={cn('font-mono text-xs tabular-nums', priorityColor(job.priority))}>
                    {job.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={cn(statusBadge[job.status] ?? '', 'border')} variant="outline">
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-secondary">
                  <span className={job.retryCount >= job.maxRetries ? 'text-status-failed' : ''}>
                    {job.retryCount}/{job.maxRetries}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {intervalLabel(job.interval)}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-muted whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{relTime(job.createdAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      {fmtExact(job.createdAt)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-secondary whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{relTime(job.scheduledAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      {fmtExact(job.scheduledAt)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                  {job.startedAt ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-secondary cursor-default">{relTime(job.startedAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start">
                        {fmtExact(job.startedAt)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-text-muted">{'\u2014'}</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                  {job.completedAt ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-secondary cursor-default">{relTime(job.completedAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start">
                        {fmtExact(job.completedAt)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-text-muted">{'\u2014'}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {job.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => cancelJob.mutate(job.id)}
                        title="Cancel"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                      </Button>
                    )}
                    {job.status !== 'processing' && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteJob.mutate(job.id)}
                        title="Delete"
                      >
                        <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3 text-status-failed" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-text-muted">
                  {search || statusFilter !== 'all'
                    ? 'No jobs match the current filters'
                    : 'No jobs found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
