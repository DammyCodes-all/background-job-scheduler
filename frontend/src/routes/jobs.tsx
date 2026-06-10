/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useJobsQuery, useCancelJobMutation, useDeleteJobMutation } from '@/hooks/useJobQueries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import { format } from 'date-fns'

export const Route = createFileRoute('/jobs')({
  component: JobsPage,
})

const statusBadge: Record<string, string> = {
  pending:    'bg-status-pending/10 text-status-pending border-status-pending/20',
  processing: 'bg-status-processing/10 text-status-processing border-status-processing/20',
  completed:  'bg-status-completed/10 text-status-completed border-status-completed/20',
  failed:     'bg-status-failed/10 text-status-failed border-status-failed/20',
  cancelled:  'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
}

function JobsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useJobsQuery(page)
  const cancelJob = useCancelJobMutation()
  const deleteJob = useDeleteJobMutation()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  const jobs = data?.data ?? []

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Jobs</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {data?.total ?? 0} total — page {page} of {data?.totalPages ?? 1}
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

      <div className="rounded-lg border border-border-base bg-bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="border-border-base">
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">ID</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Type</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Priority</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Status</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Retries</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Interval</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Scheduled</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Created</TableHead>
              <TableHead className="w-24 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="border-border-base hover:bg-bg-elevated">
                <TableCell className="font-mono text-[11px] text-text-muted">
                  {job.id.slice(0, 8)}…
                </TableCell>
                <TableCell className="font-medium text-text-primary">{job.type}</TableCell>
                <TableCell>
                  <span className={`font-mono text-xs tabular-nums ${
                    job.priority === 1 ? 'text-status-failed' :
                    job.priority === 2 ? 'text-status-pending' :
                    'text-status-completed'
                  }`}>
                    {job.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={statusBadge[job.status] ?? ''} variant="outline">
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-secondary">
                  {job.retryCount}/{job.maxRetries}
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {job.interval?.replace(/_/g, ' ') ?? '—'}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-secondary whitespace-nowrap">
                  {format(new Date(job.scheduledAt), 'MMM d, HH:mm:ss')}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-muted whitespace-nowrap">
                  {format(new Date(job.createdAt), 'MMM d, HH:mm')}
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
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-text-muted">
                  No jobs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
