import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Newsletter } from '@shared/types'

export function useNewsletters(params?: { status?: string }) {
  return useQuery({
    queryKey: ['newsletters', params],
    queryFn: () => adminApi.newsletters.list(params),
  })
}

export function useNewsletter(id: string) {
  return useQuery({
    queryKey: ['newsletter', id],
    queryFn: () => adminApi.newsletters.get(id),
    enabled: !!id,
  })
}

export function useCreateNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) => adminApi.newsletters.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] })
    },
  })
}

export function useUpdateNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Newsletter> }) =>
      adminApi.newsletters.update(id, data),
    onSuccess: (newsletter) => {
      queryClient.setQueryData(['newsletter', newsletter.id], newsletter)
      queryClient.invalidateQueries({ queryKey: ['newsletters'] })
    },
  })
}

export function useDeleteNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.newsletters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] })
    },
  })
}

export function useAssignNewsletterStories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.newsletters.assign(id),
    onSuccess: (newsletter) => {
      queryClient.setQueryData(['newsletter', newsletter.id], newsletter)
      queryClient.invalidateQueries({ queryKey: ['newsletters'] })
    },
  })
}

export function useGenerateNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.newsletters.generate(id),
    onSuccess: (newsletter) => {
      queryClient.setQueryData(['newsletter', newsletter.id], newsletter)
      queryClient.invalidateQueries({ queryKey: ['newsletters'] })
    },
  })
}

export function useGenerateCarousel() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await adminApi.newsletters.carousel(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `carousel-${id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

export function useGenerateHtml() {
  return useMutation({
    mutationFn: (id: string) => adminApi.newsletters.generateHtml(id),
  })
}

export function useSendTestNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.newsletters.sendTest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-sends', id] })
    },
  })
}

export function useSendLiveNewsletter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scheduledFor }: { id: string; scheduledFor?: string }) =>
      adminApi.newsletters.sendLive(id, scheduledFor),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-sends', id] })
    },
  })
}

export function useNewsletterSends(id: string) {
  return useQuery({
    queryKey: ['newsletter-sends', id],
    queryFn: () => adminApi.newsletters.listSends(id),
    enabled: !!id,
  })
}

export function useRefreshSendStats() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ newsletterId, sendId }: { newsletterId: string; sendId: string }) =>
      adminApi.newsletters.refreshStats(newsletterId, sendId),
    onSuccess: (_, { newsletterId }) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-sends', newsletterId] })
    },
  })
}
