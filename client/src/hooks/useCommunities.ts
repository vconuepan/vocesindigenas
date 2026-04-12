import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApi, memberAuth } from '../lib/api'

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => publicApi.communities.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: ['community', slug],
    queryFn: () => publicApi.communities.get(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommunityStories(slug: string, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['community-stories', slug, params],
    queryFn: () => publicApi.communities.stories(slug, params),
    enabled: !!slug,
  })
}

export function useMembership(slug: string) {
  return useQuery({
    queryKey: ['community-membership', slug],
    queryFn: () => publicApi.communities.membership(slug),
    enabled: !!slug && memberAuth.isAuthenticated(),
    retry: false,
  })
}

export function useJoinCommunity(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publicApi.communities.join(slug),
    onSuccess: () => {
      queryClient.setQueryData(['community-membership', slug], { isMember: true })
    },
  })
}

export function useLeaveCommunity(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publicApi.communities.leave(slug),
    onSuccess: () => {
      queryClient.setQueryData(['community-membership', slug], { isMember: false })
    },
  })
}
