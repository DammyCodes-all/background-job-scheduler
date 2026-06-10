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
  })
}

export function useDlqQuery(page = 1) {
  return useQuery({
    queryKey: jobKeys.dlq(page),
    queryFn: () => api.listDlq(page, 50),
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
    onSuccess: () => {
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
