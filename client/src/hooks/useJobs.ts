import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { JobRun } from '@shared/types'

export function useJobs(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => adminApi.jobs.list(),
    refetchInterval: (query) => {
      if (options?.refetchInterval) return options.refetchInterval
      // Auto-poll every 3s while any job is running
      const hasRunning = query.state.data?.some(j => j.running)
      return hasRunning ? 3_000 : false
    },
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

/** Returns the server's IANA timezone string (e.g. "UTC", "America/New_York"). */
export function useServerTimezone(): string {
  const query = useQuery({
    queryKey: ['serverTime'],
    queryFn: () => adminApi.jobs.serverTime(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  return query.data?.timezone ?? 'UTC'
}

/**
 * Fetches the server timezone once, then maintains a ticking clock
 * in that timezone using the client's local clock.
 */
export function useServerTime() {
  const query = useQuery({
    queryKey: ['serverTime'],
    queryFn: () => adminApi.jobs.serverTime(),
    staleTime: Infinity, // timezone doesn't change
    refetchOnWindowFocus: false,
  })

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!query.data) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [query.data])

  if (!query.data) return null

  const formatted = now.toLocaleTimeString('en-US', {
    timeZone: query.data.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return { time: formatted, timezone: query.data.timezone }
}

function pollJobCompletion(queryClient: QueryClient, jobName: string) {
  const maxWait = 120_000
  const interval = 3_000
  const start = Date.now()

  const poll = () => {
    adminApi.jobs.list().then(jobs => {
      queryClient.setQueryData(['jobs'], jobs)

      const job = jobs.find(j => j.jobName === jobName)
      if (!job) return

      if (!job.running) {
        queryClient.invalidateQueries({ queryKey: ['stories'] })
        queryClient.invalidateQueries({ queryKey: ['storyStats'] })
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
        return
      }

      if (Date.now() - start < maxWait) {
        setTimeout(poll, interval)
      }
    })
  }

  setTimeout(poll, interval)
}
