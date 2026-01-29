import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'

export function usePublicStories(params?: {
  page?: number
  pageSize?: number
  issueSlug?: string
}) {
  return useQuery({
    queryKey: ['public-stories', params],
    queryFn: () => publicApi.stories.list(params),
  })
}

export function usePublicStory(id: string) {
  return useQuery({
    queryKey: ['public-story', id],
    queryFn: () => publicApi.stories.get(id),
    enabled: !!id,
  })
}
