import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SseCallback } from '@/lib/api'
import { useJobStore } from '@/stores/jobStore'

export function useJobStream(onEvent?: SseCallback) {
  const setConnected = useJobStore((s) => s.setConnected)
  const queryClient = useQueryClient()

  useEffect(() => {
    const onEventRef = { current: onEvent }
    onEventRef.current = onEvent

    const es = new EventSource('/jobs/events')

    es.onopen = () => setConnected(true)

    const handleEvent = (eventType: Parameters<SseCallback>[0]) => (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      onEventRef.current?.(eventType, data)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }

    es.addEventListener('job_created', handleEvent('job_created'))
    es.addEventListener('job_updated', handleEvent('job_updated'))
    es.addEventListener('dlq_alert', handleEvent('dlq_alert'))

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
    }
  }, [setConnected, queryClient, onEvent])
}
