import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import type { Feed } from '@shared/types'
import { useFeeds, useCrawlFeed, useCrawlAllFeeds, useDeleteFeed } from '../../hooks/useFeeds'
import { useIssues } from '../../hooks/useIssues'
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
  const feedsQuery = useFeeds()
  const issuesQuery = useIssues()
  const crawlFeed = useCrawlFeed()
  const crawlAll = useCrawlAllFeeds()
  const deleteFeed = useDeleteFeed()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleEdit = (feed: Feed) => {
    setEditingFeed(feed)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingFeed(null)
    setFormOpen(true)
  }

  const handleCrawl = (id: string) => {
    crawlFeed.mutate(id, {
      onSuccess: () => toast('success', 'Feed crawled'),
      onError: () => toast('error', 'Crawl failed'),
    })
  }

  const handleCrawlAll = () => {
    crawlAll.mutate(undefined, {
      onSuccess: () => toast('success', 'All feeds crawled'),
      onError: () => toast('error', 'Crawl failed'),
    })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteFeed.mutateAsync(deleteId)
      toast('success', 'Feed deleted')
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
            <Button variant="secondary" onClick={handleCrawlAll} loading={crawlAll.isPending}>
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
          crawlingId={crawlFeed.isPending ? (crawlFeed.variables as string) : undefined}
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
        description="This will remove the feed. Stories already crawled will remain."
        variant="danger"
        confirmLabel="Delete"
        loading={deleteFeed.isPending}
      />
    </>
  )
}
