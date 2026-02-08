import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Story, StoryFilters, StoryStatus } from '@shared/types'

export function useStories(filters: StoryFilters) {
  return useQuery({
    queryKey: ['stories', filters],
    queryFn: () => adminApi.stories.list(filters),
  })
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: () => adminApi.stories.get(id),
    enabled: !!id,
  })
}

export function useUpdateStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Story> }) =>
      adminApi.stories.update(id, data),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useUpdateStoryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StoryStatus }) =>
      adminApi.stories.updateStatus(id, status),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: StoryStatus }) =>
      adminApi.stories.bulkStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function usePreassessStories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyIds?: string[]) => adminApi.stories.preassess(storyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useAssessStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.stories.assess(id),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useSelectStories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyIds: string[]) => adminApi.stories.select(storyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function usePublishStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.stories.publish(id),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useRejectStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.stories.reject(id),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useDissolveCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.stories.dissolveCluster(id),
    onSuccess: (story) => {
      queryClient.setQueryData(['story', story.id], story)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.stories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}

export function useCrawlUrl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ url, feedId }: { url: string; feedId: string }) =>
      adminApi.stories.crawlUrl(url, feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['storyStats'] })
    },
  })
}
