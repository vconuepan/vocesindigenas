import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Podcast } from '@shared/types'

export function usePodcasts(params?: { status?: string }) {
  return useQuery({
    queryKey: ['podcasts', params],
    queryFn: () => adminApi.podcasts.list(params),
  })
}

export function usePodcast(id: string) {
  return useQuery({
    queryKey: ['podcast', id],
    queryFn: () => adminApi.podcasts.get(id),
    enabled: !!id,
  })
}

export function useCreatePodcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) => adminApi.podcasts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}

export function useUpdatePodcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Podcast> }) =>
      adminApi.podcasts.update(id, data),
    onSuccess: (podcast) => {
      queryClient.setQueryData(['podcast', podcast.id], podcast)
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}

export function useDeletePodcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.podcasts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}

export function useAssignPodcastStories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.podcasts.assign(id),
    onSuccess: (podcast) => {
      queryClient.setQueryData(['podcast', podcast.id], podcast)
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}

export function useGeneratePodcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.podcasts.generate(id),
    onSuccess: (podcast) => {
      queryClient.setQueryData(['podcast', podcast.id], podcast)
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}

export function usePublishPodcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.podcasts.publish(id),
    onSuccess: (podcast) => {
      queryClient.setQueryData(['podcast', podcast.id], podcast)
      queryClient.invalidateQueries({ queryKey: ['podcasts'] })
    },
  })
}
