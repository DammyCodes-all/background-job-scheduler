/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useJobStats } from '@/hooks/useJobQueries'
import { useJobStore } from '@/stores/jobStore'
import { api } from '@/lib/api'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertTriangle,
  FlowIcon,
  ArrowRightIcon,
} from '@hugeicons/core-free-icons'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

type StatusKey = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

const statusConfig: Record<StatusKey, { label: string; value: StatusKey; color: string }> = {
  pending:    { label: 'Pending',    value: 'pending',    color: 'text-status-pending bg-status-pending/20' },
  processing: { label: 'Processing', value: 'processing', color: 'text-status-processing bg-status-processing/20' },
  completed:  { label: 'Completed',  value: 'completed',  color: 'text-status-completed bg-status-completed/20' },
  failed:     { label: 'Failed',     value: 'failed',     color: 'text-status-failed bg-status-failed/20' },
  cancelled:  { label: 'Cancelled',  value: 'cancelled',  color: 'text-status-cancelled bg-status-cancelled/20' },
}

const statusBadge: Record<string, string> = {
  pending:    'bg-status-pending/10 text-status-pending border-status-pending/20',
  processing: 'bg-status-processing/10 text-status-processing border-status-processing/20',
  completed:  'bg-status-completed/10 text-status-completed border-status-completed/20',
  failed:     'bg-status-failed/10 text-status-failed border-status-failed/20',
  cancelled:  'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
}

function DashboardPage() {
  const { data: stats, isLoading } = useJobStats()
  const isConnected = useJobStore((s) => s.isConnected)

  const { data: recentData } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => api.listJobs(1, 10),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return (
      <div className="size-full space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const entries = Object.entries(statusConfig) as [StatusKey, typeof statusConfig[StatusKey]][]
  const total = stats?.total ?? 0
  const failed = stats?.failed ?? 0
  const completed = stats?.completed ?? 0
  const dlqCount = stats?.failed ?? 0
  const failurePct = completed + failed > 0 ? Math.round((failed / (completed + failed)) * 100) : 0
  const recentJobs = recentData?.data ?? []

  return (
    <div className="size-full space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Job status overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs tabular-nums",
            isConnected ? "text-status-completed" : "text-status-failed",
          )}>
            <span className={cn(
              "size-1.5 rounded-full motion-safe:transition-colors",
              isConnected ? "bg-status-completed motion-safe:animate-pulse" : "bg-status-failed",
            )} />
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {entries.map(([key, config]) => {
          const count = stats?.[key] ?? 0
          const pct = total ? Math.round((count / total) * 100) : 0
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`text-2xl font-bold tabular-nums tracking-tight ${config.color.split(' ')[0]}`}>
                  {count}
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${config.color.split(' ')[1] ?? 'bg-muted'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total jobs</span>
          <span className="font-semibold tabular-nums">{total}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Failure rate</span>
          <span className={cn(
            "font-semibold tabular-nums",
            failurePct > 20 ? "text-status-failed" : failurePct > 5 ? "text-status-pending" : "text-status-completed",
          )}>
            {failurePct}%
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">DLQ</span>
          {dlqCount > 0 ? (
            <Link to="/dlq" className="inline-flex items-center gap-1 font-semibold tabular-nums text-status-failed hover:underline">
              <HugeiconsIcon icon={AlertTriangle} strokeWidth={2} className="size-3" />
              {dlqCount}
            </Link>
          ) : (
            <span className="font-semibold tabular-nums text-status-completed">0</span>
          )}
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={FlowIcon} strokeWidth={2} className="size-3 text-status-processing motion-safe:animate-pulse" />
          <span className="text-muted-foreground">Processing</span>
          <span className="font-semibold tabular-nums">{stats?.processing ?? 0}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="xs" asChild>
            <Link to="/jobs">
              <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="size-3" />
              View all jobs
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Recent Activity</h2>
          <Button variant="ghost" size="xs" asChild>
            <Link to="/jobs">
              View all
              <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="size-3" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Scheduled</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Retries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-foreground text-xs">{job.type}</TableCell>
                  <TableCell>
                    <Badge className={cn(statusBadge[job.status] ?? '', 'border')} variant="outline">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(job.scheduledAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {job.retryCount}/{job.maxRetries}
                  </TableCell>
                </TableRow>
              ))}
              {recentJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                    No jobs yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
