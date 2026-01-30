import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQueryClient } from '@tanstack/react-query'
import type { Feed } from '@shared/types'
import { useFeeds, useDeleteFeed } from '../../hooks/useFeeds'
import { useIssues } from '../../hooks/useIssues'
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks'
import { adminApi } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FeedTable } from '../../components/admin/FeedTable'
import { FeedForm } from '../../components/admin/FeedForm'
import { useToast } from '../../components/ui/Toast'

export default function FeedsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const feedsQuery = useFeeds(showInactive ? undefined : { active: true })
  const issuesQuery = useIssues()
  const deleteFeed = useDeleteFeed()
  const { toast } = useToast()
  const { launchTask } = useBackgroundTasks()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const invalidateFeeds = () => {
    queryClient.invalidateQueries({ queryKey: ['feeds'] })
  }

  const handleEdit = (feed: Feed) => {
    setEditingFeed(feed)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingFeed(null)
    setFormOpen(true)
  }

  const handleCrawl = (id: string) => {
    const feed = feedsQuery.data?.find(f => f.id === id)
    const label = `Crawling ${feed?.title || 'feed'}`

    launchTask({
      id: `crawl-feed-${id}-${Date.now()}`,
      label,
      executor: async () => {
        const result = await adminApi.feeds.crawl(id)
        return { succeeded: result.newStories, failed: result.errors }
      },
      onComplete: invalidateFeeds,
    })
  }

  const handleCrawlAll = () => {
    const feeds = feedsQuery.data
    if (!feeds || feeds.length === 0) return

    const activeFeeds = feeds.filter(f => f.active)
    const label = `Crawling ${activeFeeds.length} feeds`

    launchTask({
      id: `crawl-all-${Date.now()}`,
      label,
      executor: async (reportProgress) => {
        let succeeded = 0
        let failed = 0
        for (const feed of activeFeeds) {
          try {
            const result = await adminApi.feeds.crawl(feed.id)
            succeeded += result.newStories
            failed += result.errors
          } catch {
            failed++
          }
          reportProgress(activeFeeds.indexOf(feed) + 1, activeFeeds.length)
        }
        return { succeeded, failed }
      },
      onComplete: invalidateFeeds,
    })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const result = await deleteFeed.mutateAsync(deleteId)
      toast('success', result.message)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete feed')
    }
    setDeleteId(null)
  }

  return (
    <>
      <Helmet>
        <title>Feeds — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Feeds"
        description={feedsQuery.data ? `${feedsQuery.data.length} feeds` : undefined}
        actions={
          <>
            <Button
              variant={showInactive ? 'secondary' : 'ghost'}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Hide inactive' : 'Show inactive'}
            </Button>
            <Button variant="secondary" onClick={handleCrawlAll}>
              Crawl All
            </Button>
            <Button onClick={handleAdd}>Add Feed</Button>
          </>
        }
      />

      {feedsQuery.isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {feedsQuery.error && <ErrorState message="Failed to load feeds" onRetry={() => feedsQuery.refetch()} />}
      {feedsQuery.data && feedsQuery.data.length === 0 && <EmptyState title="No feeds yet" description="Add your first RSS feed." />}
      {feedsQuery.data && feedsQuery.data.length > 0 && (
        <FeedTable
          feeds={feedsQuery.data}
          issues={issuesQuery.data || []}
          onEdit={handleEdit}
          onCrawl={handleCrawl}
          onDelete={setDeleteId}
        />
      )}

      <FeedForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        feed={editingFeed}
        issues={issuesQuery.data || []}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete feed?"
        description="If the feed has stories it will be deactivated. Otherwise it will be permanently removed."
        variant="danger"
        confirmLabel="Delete"
        loading={deleteFeed.isPending}
      />
    </>
  )
}
