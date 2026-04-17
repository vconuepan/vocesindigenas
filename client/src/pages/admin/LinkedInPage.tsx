import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { ArrowTopRightOnSquareIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { HeartIcon, ChatBubbleOvalLeftIcon, EyeIcon } from '@heroicons/react/24/outline'
import type { LinkedInPost, LinkedInPostStatus } from '@shared/types'
import { adminApi } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ActionIconButton } from '../../components/ui/ActionIconButton'
import { useToast } from '../../components/ui/Toast'
import { formatRelativeTime } from '../../lib/constants'

const STATUS_COLORS: Record<LinkedInPostStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<LinkedInPostStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  failed: 'Fallido',
}

type Filter = 'all' | LinkedInPostStatus

const PAGE_SIZE = 25

export default function LinkedInPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const query = useQuery({
    queryKey: ['linkedinPosts', filter, page],
    queryFn: () =>
      adminApi.linkedin.listPosts({
        status: filter === 'all' ? undefined : filter,
        page,
        limit: PAGE_SIZE,
      }),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.linkedin.deletePost(id),
    onSuccess: () => {
      toast('success', 'Publicación eliminada')
      queryClient.invalidateQueries({ queryKey: ['linkedinPosts'] })
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Error al eliminar'),
  })

  const refreshMetricsMutation = useMutation({
    mutationFn: () => adminApi.linkedin.refreshMetrics(),
    onSuccess: () => {
      toast('success', 'Métricas actualizadas')
      queryClient.invalidateQueries({ queryKey: ['linkedinPosts'] })
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Error al actualizar métricas'),
  })

  const posts = query.data?.posts ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const published = posts.filter((p) => p.status === 'published').length
  const drafts = posts.filter((p) => p.status === 'draft').length
  const failed = posts.filter((p) => p.status === 'failed').length

  const totalLikes = posts.filter((p) => p.status === 'published').reduce((s, p) => s + p.likeCount, 0)
  const totalComments = posts.filter((p) => p.status === 'published').reduce((s, p) => s + p.commentCount, 0)
  const totalImpressions = posts.filter((p) => p.status === 'published').reduce((s, p) => s + p.impressionCount, 0)

  function handleDelete(post: LinkedInPost) {
    if (!confirm(`¿Eliminar esta publicación de LinkedIn?\n\n"${post.postText.slice(0, 80)}..."`)) return
    deleteMutation.mutate(post.id)
  }

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setPage(1)
  }

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'published', label: 'Publicados' },
    { value: 'draft', label: 'Borradores' },
    { value: 'failed', label: 'Fallidos' },
  ]

  return (
    <>
      <Helmet>
        <title>LinkedIn — Admin — Impacto Indígena</title>
      </Helmet>

      <PageHeader
        title="LinkedIn"
        description="Publicaciones generadas y publicadas en LinkedIn"
      />

      {/* Stats bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Total (página)', value: total, color: 'text-neutral-900' },
          { label: 'Publicados', value: published, color: 'text-green-700' },
          { label: 'Borradores', value: drafts, color: 'text-amber-700' },
          { label: 'Fallidos', value: failed, color: 'text-red-700' },
          { label: 'Likes', value: totalLikes, color: 'text-rose-600', icon: '❤️' },
          { label: 'Comentarios', value: totalComments, color: 'text-blue-600', icon: '💬' },
          { label: 'Impresiones', value: totalImpressions, color: 'text-purple-600', icon: '👁️' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-neutral-200 px-4 py-3">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-0.5">
              {s.icon ? `${s.icon} ${s.label}` : s.label}
            </p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + refresh button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                filter === f.value
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => refreshMetricsMutation.mutate()}
          disabled={refreshMetricsMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-50"
          title="Actualizar métricas de engagement (solo cuentas de organización)"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshMetricsMutation.isPending ? 'animate-spin' : ''}`} />
          Actualizar métricas
        </button>
      </div>

      {/* Content */}
      {query.isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : query.isError ? (
        <ErrorState message="Error al cargar las publicaciones de LinkedIn" />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Sin publicaciones"
          description="No hay publicaciones de LinkedIn en esta categoría"
        />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Historia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">
                    Texto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide hidden lg:table-cell">
                    Métricas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide hidden md:table-cell">
                    Publicado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === post.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Página {page} de {totalPages} ({total} publicaciones)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 rounded-md disabled:opacity-40 hover:bg-neutral-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-neutral-200 rounded-md disabled:opacity-40 hover:bg-neutral-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function PostRow({
  post,
  onDelete,
  isDeleting,
}: {
  post: LinkedInPost
  onDelete: (post: LinkedInPost) => void
  isDeleting: boolean
}) {
  const storyTitle = post.story?.title ?? post.story?.titleLabel ?? '—'
  const issueName = post.story?.issue?.name

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      {/* Story */}
      <td className="px-4 py-3 max-w-[180px]">
        <div className="truncate font-medium text-neutral-800" title={storyTitle}>
          {storyTitle}
        </div>
        {issueName && (
          <div className="text-xs text-neutral-400 truncate">{issueName}</div>
        )}
      </td>

      {/* Post text */}
      <td className="px-4 py-3 hidden sm:table-cell max-w-[300px]">
        <p className="text-neutral-600 text-xs line-clamp-2">{post.postText}</p>
        {post.error && (
          <p className="text-red-500 text-xs mt-0.5 truncate" title={post.error}>
            Error: {post.error}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_COLORS[post.status]
          }`}
        >
          {STATUS_LABELS[post.status]}
        </span>
      </td>

      {/* Metrics */}
      <td className="px-4 py-3 hidden lg:table-cell">
        {post.status === 'published' ? (
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span className="flex items-center gap-1" title="Likes">
              <HeartIcon className="h-3.5 w-3.5 text-rose-400" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1" title="Comentarios">
              <ChatBubbleOvalLeftIcon className="h-3.5 w-3.5 text-blue-400" />
              {post.commentCount}
            </span>
            <span className="flex items-center gap-1" title="Impresiones">
              <EyeIcon className="h-3.5 w-3.5 text-purple-400" />
              {post.impressionCount}
            </span>
            {post.metricsUpdatedAt && (
              <span className="text-neutral-400 text-[10px]" title={`Actualizado ${formatRelativeTime(post.metricsUpdatedAt)}`}>
                ↻ {formatRelativeTime(post.metricsUpdatedAt)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-neutral-300 text-xs">—</span>
        )}
      </td>

      {/* Published at */}
      <td className="px-4 py-3 text-xs text-neutral-500 hidden md:table-cell whitespace-nowrap">
        {post.publishedAt ? formatRelativeTime(post.publishedAt) : '—'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver en LinkedIn"
              className="rounded p-1 text-neutral-400 hover:text-neutral-600"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          )}
          <ActionIconButton
            icon={TrashIcon}
            label="Eliminar"
            onClick={() => onDelete(post)}
            disabled={isDeleting}
            variant="danger"
          />
        </div>
      </td>
    </tr>
  )
}
