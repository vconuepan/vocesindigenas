import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'

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
