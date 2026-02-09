import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => publicApi.sources(),
    staleTime: 5 * 60 * 1000, // Match server cache TTL
  })
}
