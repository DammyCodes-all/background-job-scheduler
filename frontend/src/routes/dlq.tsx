/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useDlqQuery, useRetryJobMutation } from '@/hooks/useJobQueries'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { HugeiconsIcon } from '@hugeicons/react'
import { RedoIcon } from '@hugeicons/core-free-icons'
import { format } from 'date-fns'

export const Route = createFileRoute('/dlq')({
  component: DlqPage,
})

function DlqPage() {
  const { data, isLoading } = useDlqQuery(1)
  const retryJob = useRetryJobMutation()

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
          <h1 className="text-lg font-semibold text-text-primary">Dead Letter Queue</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {data?.total ?? 0} failed jobs awaiting resolution
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border-base bg-bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="border-border-base">
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">ID</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Type</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Error</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Retries</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Failed At</TableHead>
              <TableHead className="w-20 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="border-border-base hover:bg-bg-elevated">
                <TableCell className="font-mono text-[11px] text-text-muted">
                  {job.id.slice(0, 8)}…
                </TableCell>
                <TableCell className="font-medium text-text-primary">{job.type}</TableCell>
                <TableCell className="max-w-xs">
                  <code className="line-clamp-2 text-xs text-status-failed font-mono">
                    {job.errorMessage ?? 'Unknown error'}
                  </code>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-secondary">
                  {job.retryCount}/{job.maxRetries}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-text-muted whitespace-nowrap">
                  {job.completedAt
                    ? format(new Date(job.completedAt), 'MMM d, HH:mm:ss')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => retryJob.mutate(job.id)}
                    disabled={retryJob.isPending}
                    className="gap-1"
                  >
                    <HugeiconsIcon icon={RedoIcon} strokeWidth={2} className="size-3" />
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                  No jobs in the dead letter queue
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
