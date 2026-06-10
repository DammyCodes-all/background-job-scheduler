import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useJobStore } from '@/stores/jobStore'
import type { SseCallback, SseEventPayload, PaginatedResult, Job, JobStatus } from '@/lib/api'

const FLASH_DURATION = 3000

export function useJobStream(onEvent?: SseCallback) {
  const setConnected = useJobStore((s) => s.setConnected)
  const addFlashingId = useJobStore((s) => s.addFlashingId)
  const removeFlashingId = useJobStore((s) => s.removeFlashingId)
  const queryClient = useQueryClient()

  useEffect(() => {
    const onEventRef = { current: onEvent }
    onEventRef.current = onEvent

    const timeouts = new Set<ReturnType<typeof setTimeout>>()

    const flash = (id: string) => {
      addFlashingId(id)
      const t = setTimeout(() => removeFlashingId(id), FLASH_DURATION)
      timeouts.add(t)
    }

    const baseUrl = import.meta.env.VITE_API_URL ?? ''
    const es = new EventSource(`${baseUrl}/jobs/events`)

    es.onopen = () => setConnected(true)

    es.addEventListener('job_created', (e: MessageEvent) => {
      const data: SseEventPayload['job_created'] = JSON.parse(e.data)
      flash(data.jobId)
      onEventRef.current?.('job_created', data)

      const placeholder: Job = {
        id: data.jobId,
        type: data.type,
        status: data.status as JobStatus,
        priority: data.priority,
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date().toISOString(),
        interval: null,
        dependencyIds: [],
        errorMessage: null,
        inDlq: false,
        createdAt: new Date().toISOString(),
        lastPriorityBoostedAt: null,
        startedAt: null,
        completedAt: null,
        payload: null,
      }

      queryClient.setQueryData<PaginatedResult<Job>>(['jobs', 'list', 1], (old) => {
        if (!old) return old
        return { ...old, data: [placeholder, ...old.data], total: old.total + 1 }
      })

      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    })

    es.addEventListener('job_updated', (e: MessageEvent) => {
      const data: SseEventPayload['job_updated'] = JSON.parse(e.data)
      flash(data.jobId)
      onEventRef.current?.('job_updated', data)

      queryClient.setQueriesData<PaginatedResult<Job>>(
        { queryKey: ['jobs', 'list'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((job) =>
              job.id === data.jobId
                ? {
                    ...job,
                    status: (data.status as JobStatus) ?? job.status,
                    retryCount: data.retryCount ?? job.retryCount,
                    inDlq: data.inDlq ?? job.inDlq,
                  }
                : job,
            ),
          }
        },
      )

      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    })

    es.addEventListener('dlq_alert', (e: MessageEvent) => {
      const data: SseEventPayload['dlq_alert'] = JSON.parse(e.data)
      onEventRef.current?.('dlq_alert', data)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    })

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
      timeouts.forEach(clearTimeout)
    }
  }, [setConnected, addFlashingId, removeFlashingId, queryClient, onEvent])
}
