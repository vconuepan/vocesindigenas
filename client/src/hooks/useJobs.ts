import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
    onSuccess: (_data, jobName) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      pollJobCompletion(queryClient, jobName)
    },
  })
}

function pollJobCompletion(queryClient: QueryClient, jobName: string) {
  const triggerTime = Date.now()
  const maxWait = 120_000
  const interval = 3_000

  const poll = () => {
    adminApi.jobs.list().then(jobs => {
      const job = jobs.find(j => j.jobName === jobName)
      if (!job) return

      const completedAt = job.lastCompletedAt ? new Date(job.lastCompletedAt).getTime() : 0
      if (completedAt >= triggerTime) {
        queryClient.invalidateQueries({ queryKey: ['stories'] })
        queryClient.invalidateQueries({ queryKey: ['storyStats'] })
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
        return
      }

      if (Date.now() - triggerTime < maxWait) {
        setTimeout(poll, interval)
      }
    })
  }

  setTimeout(poll, interval)
}
