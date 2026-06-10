import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useJobStore } from '@/stores/jobStore'
import type { SseCallback, SseEventPayload } from '@/lib/api'

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
    es.onerror = () => setConnected(false)

    function handleEvent<T extends keyof SseEventPayload>(
      eventType: T,
      fn: (data: SseEventPayload[T]) => void,
    ) {
      es.addEventListener(eventType, (e: Event) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as SseEventPayload[T]
          fn(data)
        } catch (err) {
          console.error(`SSE ${eventType} parse error:`, err)
        }
      })
    }

    handleEvent('job_created', (data) => {
      flash(data.jobId)
      onEventRef.current?.('job_created', data)
      queryClient.refetchQueries({ queryKey: ['jobs'] })
    })

    handleEvent('job_updated', (data) => {
      flash(data.jobId)
      onEventRef.current?.('job_updated', data)
      queryClient.refetchQueries({ queryKey: ['jobs'] })
    })

    handleEvent('dlq_alert', (data) => {
      onEventRef.current?.('dlq_alert', data)
      queryClient.refetchQueries({ queryKey: ['jobs'] })
    })

    return () => {
      es.close()
      setConnected(false)
      timeouts.forEach(clearTimeout)
    }
  }, [setConnected, addFlashingId, removeFlashingId, queryClient, onEvent])
}
