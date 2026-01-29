import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { JobRun } from '@shared/types'

export function useJobs(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => adminApi.jobs.list(),
    refetchInterval: options?.refetchInterval,
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobName, data }: { jobName: string; data: Partial<JobRun> }) =>
      adminApi.jobs.update(jobName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useRunJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobName: string) => adminApi.jobs.run(jobName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
