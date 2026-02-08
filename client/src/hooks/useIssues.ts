import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Issue } from '@shared/types'

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: () => adminApi.issues.list(),
  })
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: () => adminApi.issues.get(id),
    enabled: !!id,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Issue>) => adminApi.issues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Issue> }) =>
      adminApi.issues.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['issue', id] })
    },
  })
}

export function useDeleteIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.issues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}
