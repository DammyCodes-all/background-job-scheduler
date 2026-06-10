/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useJobsQuery } from '@/hooks/useJobQueries'
import { useMemo } from 'react'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

type StatusKey = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

const statusConfig: Record<StatusKey, { label: string; value: StatusKey; color: string }> = {
  pending:    { label: 'Pending',    value: 'pending',    color: 'text-status-pending bar:bg-status-pending/20' },
  processing: { label: 'Processing', value: 'processing', color: 'text-status-processing bar:bg-status-processing/20' },
  completed:  { label: 'Completed',  value: 'completed',  color: 'text-status-completed bar:bg-status-completed/20' },
  failed:     { label: 'Failed',     value: 'failed',     color: 'text-status-failed bar:bg-status-failed/20' },
  cancelled:  { label: 'Cancelled',  value: 'cancelled',  color: 'text-status-cancelled bar:bg-status-cancelled/20' },
}

function DashboardPage() {
  const { data, isLoading } = useJobsQuery(1)

  const stats = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 }
    if (!data?.data) return counts
    for (const job of data.data) {
      if (job.status in counts) counts[job.status]++
    }
    return counts
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
        <p className="text-xs text-text-muted mt-0.5">Job status overview</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {entries.map(([key, config]) => {
          const count = stats[key] ?? 0
          const pct = data?.total ? Math.round((count / data.total) * 100) : 0
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`text-2xl font-bold tabular-nums tracking-tight ${config.color.split(' ')[0]}`}>
                  {count}
                </div>
                <div className="h-1 rounded-full bg-bg-subtle overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${config.color.split(' ')[1] ?? 'bg-bg-subtle'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
