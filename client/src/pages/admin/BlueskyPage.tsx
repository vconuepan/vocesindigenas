import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import type { BlueskyPostStatus } from '@shared/types'
import { adminApi } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { ActionIconButton } from '../../components/ui/ActionIconButton'
import { useToast } from '../../components/ui/Toast'

const STATUS_COLORS: Record<BlueskyPostStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

/** Convert an AT Protocol URI (at://did/collection/rkey) to a bsky.app web URL */
function atUriToWebUrl(atUri: string): string | null {
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/(.+)$/)
  if (!match) return null
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function BlueskyPage() {
  const [statusFilter, setStatusFilter] = useState<BlueskyPostStatus | ''>('')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const pageSize = 20

  const postsQuery = useQuery({
    queryKey: ['blueskyPosts', statusFilter, page],
    queryFn: () =>
      adminApi.bluesky.listPosts({
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      }),
  })

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm('Delete this post? Published posts will also be removed from Bluesky.')) return
    setDeletingId(postId)
    try {
      await adminApi.bluesky.deletePost(postId)
      toast('success', 'Post deleted')
      queryClient.invalidateQueries({ queryKey: ['blueskyPosts'] })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }, [queryClient, toast])

  const handleRefreshMetrics = useCallback(async () => {
    setRefreshing(true)
    try {
      await adminApi.bluesky.refreshMetrics()
      toast('success', 'Metrics updated')
      queryClient.invalidateQueries({ queryKey: ['blueskyPosts'] })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to refresh metrics')
    } finally {
      setRefreshing(false)
    }
  }, [queryClient, toast])

  const posts = postsQuery.data?.posts || []
  const total = postsQuery.data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  // Compute stats from current data
  const publishedPosts = posts.filter(p => p.status === 'published')
  const avgLikes = publishedPosts.length > 0
    ? Math.round(publishedPosts.reduce((sum, p) => sum + (p.likeCount || 0), 0) / publishedPosts.length)
    : 0
  const avgReposts = publishedPosts.length > 0
    ? Math.round(publishedPosts.reduce((sum, p) => sum + (p.repostCount || 0), 0) / publishedPosts.length)
    : 0

  return (
    <>
      <Helmet>
        <title>Bluesky — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Bluesky"
        description={total > 0 ? `${total} posts` : undefined}
        actions={
          <Button variant="secondary" onClick={handleRefreshMetrics} loading={refreshing}>
            Refresh Metrics
          </Button>
        }
      />

      {/* Stats bar */}
      {postsQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-md bg-white border border-neutral-200 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{total}</p>
            <p className="text-xs text-neutral-500">Total Posts</p>
          </div>
          <div className="rounded-md bg-white border border-neutral-200 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{publishedPosts.length}</p>
            <p className="text-xs text-neutral-500">Published</p>
          </div>
          <div className="rounded-md bg-white border border-neutral-200 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{avgLikes}</p>
            <p className="text-xs text-neutral-500">Avg Likes</p>
          </div>
          <div className="rounded-md bg-white border border-neutral-200 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{avgReposts}</p>
            <p className="text-xs text-neutral-500">Avg Reposts</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="mb-4 flex gap-2">
        {(['', 'draft', 'published', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1) }}
            aria-pressed={statusFilter === status}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              statusFilter === status
                ? 'bg-brand-100 text-brand-800 font-medium'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {postsQuery.isLoading && (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      )}

      {postsQuery.error && (
        <ErrorState message="Failed to load Bluesky posts" onRetry={() => postsQuery.refetch()} />
      )}

      {postsQuery.data && posts.length === 0 && (
        <EmptyState
          title="No Bluesky posts"
          description={statusFilter ? `No ${statusFilter} posts found.` : 'No posts yet. Use the Stories page to create your first Bluesky post.'}
        />
      )}

      {postsQuery.data && posts.length > 0 && (
        <>
          <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Story</th>
                  <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Post Text</th>
                  <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
                  <th scope="col" className="hidden md:table-cell text-left px-3 py-2 font-medium text-neutral-500">Posted</th>
                  <th scope="col" className="hidden lg:table-cell text-right px-3 py-2 font-medium text-neutral-500">Engagement</th>
                  <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isExpanded = expandedId === post.id
                  const webUrl = post.postUri ? atUriToWebUrl(post.postUri) : null
                  return (
                    <tr
                      key={post.id}
                      className={`border-b border-neutral-100 last:border-0 group cursor-pointer ${isExpanded ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      onClick={() => setExpandedId(isExpanded ? null : post.id)}
                    >
                      <td className="px-3 py-2 max-w-[180px]">
                        <p className="font-medium text-neutral-900 truncate group-hover:text-brand-700">
                          {post.story?.title || 'Untitled'}
                        </p>
                        {post.story?.issue && (
                          <p className="text-xs text-neutral-500">{post.story.issue.name}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[300px]">
                        {isExpanded ? (
                          <div className="text-neutral-700 whitespace-pre-wrap">{post.postText}</div>
                        ) : (
                          <p className="text-neutral-700 truncate">{post.postText}</p>
                        )}
                        {post.error && (
                          <p className="text-xs text-red-600 truncate mt-0.5" title={post.error}>
                            {post.error}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status as BlueskyPostStatus] || 'bg-neutral-100 text-neutral-800'}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-neutral-500 whitespace-nowrap">
                        {formatRelativeTime(post.publishedAt)}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2 text-right text-neutral-500 whitespace-nowrap tabular-nums">
                        {post.status === 'published'
                          ? `${post.likeCount ?? 0}L ${post.repostCount ?? 0}R ${post.replyCount ?? 0}C ${post.quoteCount ?? 0}Q`
                          : '-'}
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {webUrl && (
                            <a
                              href={webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Bluesky"
                              aria-label="View on Bluesky"
                              className="rounded p-1 text-neutral-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                            </a>
                          )}
                          <ActionIconButton
                            icon={TrashIcon}
                            label="Delete"
                            variant="danger"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </>
  )
}
