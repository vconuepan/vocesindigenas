import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Feed } from '@shared/types'

export function useFeeds(params?: { issueId?: string; active?: boolean }) {
  return useQuery({
    queryKey: ['feeds', params],
    queryFn: () => adminApi.feeds.list(params),
  })
}

export function useFeed(id: string) {
  return useQuery({
    queryKey: ['feed', id],
    queryFn: () => adminApi.feeds.get(id),
    enabled: !!id,
  })
}

export function useCreateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Feed>) => adminApi.feeds.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useUpdateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Feed> }) =>
      adminApi.feeds.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.feeds.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useCrawlFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.feeds.crawl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useCrawlAllFeeds() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => adminApi.feeds.crawlAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}
