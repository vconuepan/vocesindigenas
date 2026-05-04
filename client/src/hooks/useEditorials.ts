import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/admin-api'
import type { Editorial } from '@shared/types'

export function useEditorials(params?: { status?: string }) {
  return useQuery({
    queryKey: ['editorials', params],
    queryFn: () => adminApi.editorials.list(params),
  })
}

export function useEditorial(id: string) {
  return useQuery({
    queryKey: ['editorial', id],
    queryFn: () => adminApi.editorials.get(id),
    enabled: !!id,
  })
}

export function useCreateEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) => adminApi.editorials.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorials'] })
    },
  })
}

export function useUpdateEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Editorial> }) =>
      adminApi.editorials.update(id, data),
    onSuccess: (editorial) => {
      queryClient.setQueryData(['editorial', editorial.id], editorial)
      queryClient.invalidateQueries({ queryKey: ['editorials'] })
    },
  })
}

export function useDeleteEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.editorials.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorials'] })
    },
  })
}

export function useGenerateEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.editorials.generate(id),
    onSuccess: (editorial) => {
      queryClient.setQueryData(['editorial', editorial.id], editorial)
    },
  })
}

export function usePublishEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.editorials.publish(id),
    onSuccess: (editorial) => {
      queryClient.setQueryData(['editorial', editorial.id], editorial)
      queryClient.invalidateQueries({ queryKey: ['editorials'] })
    },
  })
}

export function useUnpublishEditorial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.editorials.unpublish(id),
    onSuccess: (editorial) => {
      queryClient.setQueryData(['editorial', editorial.id], editorial)
      queryClient.invalidateQueries({ queryKey: ['editorials'] })
    },
  })
}

export function useEditorialLinkedIn() {
  return useMutation({
    mutationFn: (id: string) => adminApi.editorials.linkedin(id),
  })
}
