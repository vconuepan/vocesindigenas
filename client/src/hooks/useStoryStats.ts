import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'

export function useStoryStats() {
  return useQuery({
    queryKey: ['storyStats'],
    queryFn: () => adminApi.stories.stats(),
  })
}
