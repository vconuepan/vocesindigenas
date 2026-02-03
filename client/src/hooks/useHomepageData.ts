import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'

export function useHomepageData() {
  return useQuery({
    queryKey: ['homepage-data'],
    queryFn: () => publicApi.homepage(),
    staleTime: 60 * 1000, // 1 minute
  })
}
