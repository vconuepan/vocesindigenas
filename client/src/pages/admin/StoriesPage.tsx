import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import type { StoryStatus, StoryFilters, StorySort } from '@shared/types'
import { useStories, useBulkUpdateStatus, useDeleteStory, useUpdateStoryStatus } from '../../hooks/useStories'
import { useFeeds } from '../../hooks/useFeeds'
import { useIssues } from '../../hooks/useIssues'
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks'
import { adminApi } from '../../lib/admin-api'
import { parallelMap } from '../../lib/async-utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StoryFiltersBar } from '../../components/admin/StoryFiltersBar'
import { StoryTable } from '../../components/admin/StoryTable'
import { BulkActionsBar } from '../../components/admin/BulkActionsBar'
import { StoryDetail } from '../../components/admin/StoryDetail'
import { CrawlUrlForm } from '../../components/admin/CrawlUrlForm'
import { useToast } from '../../components/ui/Toast'

function useFiltersFromParams(): StoryFilters {
  const [searchParams] = useSearchParams()
  return {
    status: (searchParams.get('status') as StoryStatus) || undefined,
    issueId: searchParams.get('issueId') || undefined,
    feedId: searchParams.get('feedId') || undefined,
    emotionTag: searchParams.get('emotionTag') as StoryFilters['emotionTag'] || undefined,
    sort: (searchParams.get('sort') as StorySort) || 'date_desc',
    page: Number(searchParams.get('page')) || 1,
    pageSize: 25,
  }
}

export default function StoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useFiltersFromParams()
  const queryClient = useQueryClient()
  const storiesQuery = useStories(filters)
  const feedsQuery = useFeeds()
  const issuesQuery = useIssues()
  const { toast } = useToast()
  const { launchTask } = useBackgroundTasks()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [crawlOpen, setCrawlOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null)

  const bulkUpdate = useBulkUpdateStatus()
  const deleteStory = useDeleteStory()
  const updateStatus = useUpdateStoryStatus()

  const invalidateStories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['stories'] })
    queryClient.invalidateQueries({ queryKey: ['storyStats'] })
  }, [queryClient])

  const stories = storiesQuery.data?.data || []

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === stories.length ? new Set() : new Set(stories.map(s => s.id)),
    )
  }, [stories])

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    setSearchParams(next)
    setSelectedIds(new Set())
  }

  const handleBulkAction = (action: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    if (action === 'preassess') {
      setConfirmAction({
        title: `Pre-assess ${ids.length} stories?`,
        description: 'This will run AI pre-assessment on the selected stories.',
        action: async () => {
          setSelectedIds(new Set())
          launchTask({
            id: `preassess-${Date.now()}`,
            label: `Pre-assessing ${ids.length} stories`,
            executor: async () => {
              await adminApi.stories.preassess(ids)
              return { succeeded: ids.length, failed: 0 }
            },
            onComplete: invalidateStories,
          })
        },
      })
    } else if (action === 'assess') {
      setConfirmAction({
        title: `Assess ${ids.length} stories?`,
        description: 'This will run full AI assessment on each selected story.',
        action: async () => {
          setSelectedIds(new Set())
          launchTask({
            id: `assess-${Date.now()}`,
            label: `Assessing ${ids.length} stories`,
            executor: async (reportProgress) => {
              const { results, errors } = await parallelMap(
                ids,
                (id) => adminApi.stories.assess(id),
                10,
                (completed, total) => reportProgress(completed, total),
              )
              return { succeeded: results.length, failed: errors.length }
            },
            onComplete: invalidateStories,
          })
        },
      })
    } else if (action === 'select') {
      setConfirmAction({
        title: `Select ${ids.length} stories for publication?`,
        description: 'Selected stories will be marked for publishing.',
        action: async () => {
          setSelectedIds(new Set())
          launchTask({
            id: `select-${Date.now()}`,
            label: `Selecting ${ids.length} stories`,
            executor: async () => {
              await adminApi.stories.select(ids)
              return { succeeded: ids.length, failed: 0 }
            },
            onComplete: invalidateStories,
          })
        },
      })
    } else {
      // Status change — keep blocking (instant operation)
      const status = action as StoryStatus
      setConfirmAction({
        title: `Set ${ids.length} stories to "${status}"?`,
        description: `This will update the status of ${ids.length} stories.`,
        action: async () => {
          await bulkUpdate.mutateAsync({ ids, status })
          toast('success', `Updated ${ids.length} stories`)
          setSelectedIds(new Set())
        },
      })
    }
  }

  const handleSingleStatusChange = (id: string, status: StoryStatus) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => toast('success', 'Status updated'),
      onError: () => toast('error', 'Failed to update status'),
    })
  }

  const handlePreassess = (id: string) => {
    launchTask({
      id: `preassess-${id}-${Date.now()}`,
      label: 'Pre-assessing story',
      executor: async () => {
        await adminApi.stories.preassess([id])
        return { succeeded: 1, failed: 0 }
      },
      onComplete: invalidateStories,
    })
  }

  const handleAssess = (id: string) => {
    launchTask({
      id: `assess-${id}-${Date.now()}`,
      label: 'Assessing story',
      executor: async () => {
        await adminApi.stories.assess(id)
        return { succeeded: 1, failed: 0 }
      },
      onComplete: invalidateStories,
    })
  }

  const handleSelect = (id: string) => {
    launchTask({
      id: `select-${id}-${Date.now()}`,
      label: 'Selecting story',
      executor: async () => {
        await adminApi.stories.select([id])
        return { succeeded: 1, failed: 0 }
      },
      onComplete: invalidateStories,
    })
  }

  const handlePublish = (id: string) => {
    launchTask({
      id: `publish-${id}-${Date.now()}`,
      label: 'Publishing story',
      executor: async () => {
        await adminApi.stories.publish(id)
        return { succeeded: 1, failed: 0 }
      },
      onComplete: invalidateStories,
    })
  }

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Delete story?',
      description: 'This action cannot be undone.',
      action: async () => {
        await deleteStory.mutateAsync(id)
        toast('success', 'Story deleted')
        setDetailId(null)
      },
    })
  }

  const confirmLoading = bulkUpdate.isPending || deleteStory.isPending

  return (
    <>
      <Helmet>
        <title>Stories — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Stories"
        description={storiesQuery.data ? `${storiesQuery.data.total} stories` : undefined}
        actions={
          <Button variant="secondary" onClick={() => setCrawlOpen(true)}>
            Crawl URL
          </Button>
        }
      />

      <StoryFiltersBar
        issues={issuesQuery.data || []}
        feeds={feedsQuery.data || []}
      />

      {storiesQuery.isLoading && (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      )}

      {storiesQuery.error && (
        <ErrorState message="Failed to load stories" onRetry={() => storiesQuery.refetch()} />
      )}

      {storiesQuery.data && stories.length === 0 && (
        <EmptyState title="No stories found" description="Try adjusting your filters." />
      )}

      {storiesQuery.data && stories.length > 0 && (
        <>
          <StoryTable
            stories={stories}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allSelected={selectedIds.size === stories.length}
            onView={setDetailId}
            onStatusChange={handleSingleStatusChange}
            onDelete={handleDelete}
            onPreassess={handlePreassess}
            onAssess={handleAssess}
            onSelect={handleSelect}
            onPublish={handlePublish}
          />

          <Pagination
            page={storiesQuery.data.page}
            totalPages={storiesQuery.data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <BulkActionsBar
        count={selectedIds.size}
        onAction={handleBulkAction}
        loading={confirmLoading}
      />

      <StoryDetail storyId={detailId} onClose={() => setDetailId(null)} />

      <CrawlUrlForm open={crawlOpen} onClose={() => setCrawlOpen(false)} />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (confirmAction) {
            try {
              await confirmAction.action()
            } catch (err) {
              toast('error', err instanceof Error ? err.message : 'Operation failed')
            }
          }
          setConfirmAction(null)
        }}
        title={confirmAction?.title || ''}
        description={confirmAction?.description}
        loading={confirmLoading}
      />
    </>
  )
}
