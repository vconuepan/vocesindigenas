import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'

export function usePublicIssues() {
  return useQuery({
    queryKey: ['public-issues'],
    queryFn: () => publicApi.issues.list(),
  })
}

export function usePublicIssue(slug: string) {
  return useQuery({
    queryKey: ['public-issue', slug],
    queryFn: () => publicApi.issues.get(slug),
    enabled: !!slug,
  })
}
