import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'

export function useClusters() {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: () => adminApi.clusters.list(),
  })
}

export function useCluster(id: string) {
  return useQuery({
    queryKey: ['cluster', id],
    queryFn: () => adminApi.clusters.get(id),
    enabled: !!id,
  })
}

export function useSetClusterPrimary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storyId }: { id: string; storyId: string }) =>
      adminApi.clusters.setPrimary(id, storyId),
    onSuccess: (cluster) => {
      queryClient.setQueryData(['cluster', cluster.id], cluster)
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useRemoveClusterMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storyId }: { id: string; storyId: string }) =>
      adminApi.clusters.removeMember(id, storyId),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cluster', id] })
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useMergeClusters() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: string; sourceId: string }) =>
      adminApi.clusters.merge(targetId, sourceId),
    onSuccess: (cluster) => {
      queryClient.setQueryData(['cluster', cluster.id], cluster)
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useDissolveClusterById() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.clusters.dissolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useCreateCluster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storyIds, primaryStoryId }: { storyIds: string[]; primaryStoryId: string }) =>
      adminApi.clusters.create(storyIds, primaryStoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useClusterStorySearch(query: string) {
  return useQuery({
    queryKey: ['cluster-story-search', query],
    queryFn: () => adminApi.clusters.searchStories(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
