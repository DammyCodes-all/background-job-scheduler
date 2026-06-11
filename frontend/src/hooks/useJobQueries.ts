import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type CreateJobDto, type UpdateJobDto } from '@/lib/api'

const jobKeys = {
  all: ['jobs'] as const,
  list: (page: number) => ['jobs', 'list', page] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
  dlq: (page: number) => ['jobs', 'dlq', page] as const,
  stats: ['jobs', 'stats'] as const,
}

export function useJobsQuery(page = 1) {
  return useQuery({
    queryKey: jobKeys.list(page),
    queryFn: () => api.listJobs(page, 50),
    refetchInterval: 10_000,
  })
}

export function useDlqQuery(page = 1) {
  return useQuery({
    queryKey: jobKeys.dlq(page),
    queryFn: () => api.listDlq(page, 50),
    refetchInterval: 10_000,
  })
}

export function useJobStats() {
  return useQuery({
    queryKey: jobKeys.stats,
    queryFn: () => api.getJobStats(),
    refetchInterval: 5_000,
  })
}

export function useJobQuery(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => api.getJob(id),
    enabled: !!id,
  })
}

export function useCreateJobMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateJobDto) => api.createJob(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}

export function useCancelJobMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cancelJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}

export function useDeleteJobMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.all })
      const previousQueries = new Map<string, unknown>()
      const cachedPages = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['jobs', 'list'], exact: false })
      for (const query of cachedPages) {
        const key = query.queryKey
        const prev = queryClient.getQueryData(key)
        if (prev) {
          previousQueries.set(JSON.stringify(key), prev)
          const prevData = prev as { data: Array<{ id: string }>; total: number }
          queryClient.setQueryData(key, {
            ...prevData,
            data: prevData.data.filter((job) => job.id !== id),
            total: Math.max(0, prevData.total - 1),
          })
        }
      }
      return { previousQueries }
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(JSON.parse(key), data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}

export function useRetryJobMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.retryJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}

export function useUpdateJobMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateJobDto }) => api.updateJob(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all })
    },
  })
}
