import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import type { StoryStatus, StoryFilters, StorySort } from '@shared/types'
import { useStories, useBulkUpdateStatus, useDeleteStory, useUpdateStoryStatus } from '../../hooks/useStories'
import { useFeeds } from '../../hooks/useFeeds'
import { useIssues } from '../../hooks/useIssues'
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks'
import { adminApi } from '../../lib/admin-api'
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
import { CreateClusterDialog } from '../../components/admin/CreateClusterDialog'
import { BlueskyDraftPanel } from '../../components/admin/BlueskyDraftPanel'
import type { BlueskyDraft } from '../../components/admin/BlueskyDraftPanel'
import { MastodonDraftPanel } from '../../components/admin/MastodonDraftPanel'
import type { MastodonDraft } from '../../components/admin/MastodonDraftPanel'
import { InstagramDraftPanel } from '../../components/admin/InstagramDraftPanel'
import { LinkedInDraftPanel } from '../../components/admin/LinkedInDraftPanel'
import type { InstagramPost, LinkedInPost } from '@shared/types'
import { useToast } from '../../components/ui/Toast'

const DEFAULT_PAGE_SIZE = 25

function useFiltersFromParams(): StoryFilters {
  const [searchParams] = useSearchParams()
  return {
    status: (searchParams.get('status') as StoryStatus) || undefined,
    issueId: searchParams.get('issueId') || undefined,
    feedId: searchParams.get('feedId') || undefined,
    emotionTag: searchParams.get('emotionTag') as StoryFilters['emotionTag'] || undefined,
    rating: searchParams.get('rating') || undefined,
    sort: (searchParams.get('sort') as StorySort) || 'date_desc',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE,
    search: searchParams.get('search') || undefined,
  }
}

export default function StoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Default to "published" filter on first visit (no status param in URL)
  const didDefaultRef = useRef(false)
  useEffect(() => {
    if (!didDefaultRef.current && !searchParams.has('status')) {
      didDefaultRef.current = true
      const next = new URLSearchParams(searchParams)
      next.set('status', 'published')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filters = useFiltersFromParams()
  const queryClient = useQueryClient()
  const storiesQuery = useStories(filters)
  const feedsQuery = useFeeds()
  const issuesQuery = useIssues()
  const { toast } = useToast()
  const { launchTask, launchPolledTask, processingIds } = useBackgroundTasks()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [crawlOpen, setCrawlOpen] = useState(false)
  const [clusterDialogOpen, setClusterDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null)
  const [blueskyDraft, setBlueskyDraft] = useState<BlueskyDraft | null>(null)
  const [blueskyPanelOpen, setBlueskyPanelOpen] = useState(false)
  const [blueskyPublishing, setBlueskyPublishing] = useState(false)
  const [mastodonDraft, setMastodonDraft] = useState<MastodonDraft | null>(null)
  const [mastodonPanelOpen, setMastodonPanelOpen] = useState(false)
  const [mastodonPublishing, setMastodonPublishing] = useState(false)
  const [instagramDraft, setInstagramDraft] = useState<InstagramPost | null>(null)
  const [instagramPanelOpen, setInstagramPanelOpen] = useState(false)
  const [instagramPublishing, setInstagramPublishing] = useState(false)
  const [linkedInDraft, setLinkedInDraft] = useState<LinkedInPost | null>(null)
  const [linkedInPanelOpen, setLinkedInPanelOpen] = useState(false)
  const [linkedInPublishing, setLinkedInPublishing] = useState(false)

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
    setSelectedIds(prev => {
      const allOnPageSelected = stories.length > 0 && stories.every(s => prev.has(s.id))
      return allOnPageSelected ? new Set() : new Set(stories.map(s => s.id))
    })
  }, [stories])

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    setSearchParams(next)
    setSelectedIds(new Set())
  }

  const setPageSize = (size: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('pageSize', String(size))
    next.set('page', '1')
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
          launchPolledTask({
            id: `preassess-${Date.now()}`,
            label: `Pre-assessing ${ids.length} stories`,
            submitFn: () => adminApi.stories.bulkPreassess(ids),
            onComplete: invalidateStories,
            storyIds: ids,
          })
        },
      })
    } else if (action === 'reclassify') {
      setConfirmAction({
        title: `Reclassify ${ids.length} stories?`,
        description: 'This will re-run issue and emotion classification without changing ratings or status.',
        action: async () => {
          setSelectedIds(new Set())
          launchPolledTask({
            id: `reclassify-${Date.now()}`,
            label: `Reclassifying ${ids.length} stories`,
            submitFn: () => adminApi.stories.bulkReclassify(ids),
            onComplete: invalidateStories,
            storyIds: ids,
          })
        },
      })
    } else if (action === 'assess') {
      setConfirmAction({
        title: `Assess ${ids.length} stories?`,
        description: 'This will run full AI assessment on each selected story.',
        action: async () => {
          setSelectedIds(new Set())
          launchPolledTask({
            id: `assess-${Date.now()}`,
            label: `Assessing ${ids.length} stories`,
            submitFn: () => adminApi.stories.bulkAssess(ids),
            onComplete: invalidateStories,
            storyIds: ids,
          })
        },
      })
    } else if (action === 'select') {
      setConfirmAction({
        title: `Select ${ids.length} stories for publication?`,
        description: 'Selected stories will be marked for publishing.',
        action: async () => {
          setSelectedIds(new Set())
          launchPolledTask({
            id: `select-${Date.now()}`,
            label: `Selecting ${ids.length} stories`,
            submitFn: () => adminApi.stories.bulkSelect(ids),
            onComplete: invalidateStories,
            storyIds: ids,
          })
        },
      })
    } else if (action === 'bluesky-post') {
      // Single story: generate draft and open panel
      setBlueskyPanelOpen(true)
      setBlueskyDraft(null)
      adminApi.bluesky.generateDraft(ids[0])
        .then((draft) => {
          setBlueskyDraft(draft as BlueskyDraft)
        })
        .catch((err) => {
          toast('error', err instanceof Error ? err.message : 'Failed to generate draft')
          setBlueskyPanelOpen(false)
        })
      return
    } else if (action === 'bluesky-pick') {
      // Multiple stories: pick best and generate draft
      setBlueskyPanelOpen(true)
      setBlueskyDraft(null)
      adminApi.bluesky.pickAndDraft(ids)
        .then((result) => {
          setBlueskyDraft(result as BlueskyDraft)
        })
        .catch((err) => {
          toast('error', err instanceof Error ? err.message : 'Failed to pick and draft')
          setBlueskyPanelOpen(false)
        })
      return
    } else if (action === 'mastodon-post') {
      // Single story: generate draft and open panel
      setMastodonPanelOpen(true)
      setMastodonDraft(null)
      adminApi.mastodon.generateDraft(ids[0])
        .then((draft) => {
          setMastodonDraft(draft as MastodonDraft)
        })
        .catch((err) => {
          toast('error', err instanceof Error ? err.message : 'Failed to generate draft')
          setMastodonPanelOpen(false)
        })
      return
    } else if (action === 'mastodon-pick') {
      // Multiple stories: pick best and generate draft
      setMastodonPanelOpen(true)
      setMastodonDraft(null)
      adminApi.mastodon.pickAndDraft(ids)
        .then((result) => {
          setMastodonDraft(result as MastodonDraft)
        })
        .catch((err) => {
          toast('error', err instanceof Error ? err.message : 'Failed to pick and draft')
          setMastodonPanelOpen(false)
        })
      return
    } else if (action === 'create-cluster') {
      setClusterDialogOpen(true)
      return
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
      storyIds: [id],
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
      storyIds: [id],
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
      storyIds: [id],
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

  const handleBlueskyPublish = async (postId: string) => {
    setBlueskyPublishing(true)
    try {
      await adminApi.bluesky.publishPost(postId)
      toast('success', 'Posted to Bluesky')
      setBlueskyPanelOpen(false)
      setBlueskyDraft(null)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['story'] })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setBlueskyPublishing(false)
    }
  }

  const handleBlueskyUpdate = async (postId: string, text: string) => {
    try {
      await adminApi.bluesky.updateDraft(postId, text)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save draft')
      throw err
    }
  }

  const handleBlueskyDelete = async (postId: string) => {
    try {
      await adminApi.bluesky.deletePost(postId)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete draft')
      throw err
    }
  }

  const handleMastodonPublish = async (postId: string) => {
    setMastodonPublishing(true)
    try {
      await adminApi.mastodon.publishPost(postId)
      toast('success', 'Posted to Mastodon')
      setMastodonPanelOpen(false)
      setMastodonDraft(null)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['story'] })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setMastodonPublishing(false)
    }
  }

  const handleMastodonUpdate = async (postId: string, text: string) => {
    try {
      await adminApi.mastodon.updateDraft(postId, text)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save draft')
      throw err
    }
  }

  const handleMastodonDelete = async (postId: string) => {
    try {
      await adminApi.mastodon.deletePost(postId)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete draft')
      throw err
    }
  }

  const handleInstagramGenerate = useCallback(async (storyId: string) => {
    setInstagramPanelOpen(true)
    setInstagramDraft(null)
    adminApi.instagram.generateDraft(storyId)
      .then((draft) => setInstagramDraft(draft as InstagramPost))
      .catch((err) => {
        toast('error', err instanceof Error ? err.message : 'Failed to generate Instagram draft')
        setInstagramPanelOpen(false)
      })
  }, [toast])

  const handleLinkedInGenerate = useCallback(async (storyId: string) => {
    setLinkedInPanelOpen(true)
    setLinkedInDraft(null)
    adminApi.linkedin.generateDraft(storyId)
      .then((draft) => setLinkedInDraft(draft as LinkedInPost))
      .catch((err) => {
        toast('error', err instanceof Error ? err.message : 'Failed to generate LinkedIn draft')
        setLinkedInPanelOpen(false)
      })
  }, [toast])

  const confirmLoading = bulkUpdate.isPending || deleteStory.isPending

  return (
    <>
      <Helmet>
        <title>Stories — Admin — Impacto Indígena</title>
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
            processingIds={processingIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allSelected={stories.length > 0 && stories.every(s => selectedIds.has(s.id))}
            onView={setDetailId}
            onStatusChange={handleSingleStatusChange}
            onDelete={handleDelete}
            onPreassess={handlePreassess}
            onAssess={handleAssess}
            onPublish={handlePublish}
          />

          <Pagination
            page={storiesQuery.data.page}
            totalPages={storiesQuery.data.totalPages}
            onPageChange={setPage}
            pageSize={filters.pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      <BulkActionsBar
        count={selectedIds.size}
        onAction={handleBulkAction}
        loading={confirmLoading}
        allHaveRelevance={selectedIds.size > 0 && stories.filter(s => selectedIds.has(s.id)).every(s => s.relevance != null)}
        allPublished={selectedIds.size > 0 && stories.filter(s => selectedIds.has(s.id)).every(s => s.status === 'published')}
        singleHasBlueskyPost={selectedIds.size === 1 && stories.some(s => selectedIds.has(s.id) && (s._count?.blueskyPosts ?? 0) > 0)}
        singleHasMastodonPost={selectedIds.size === 1 && stories.some(s => selectedIds.has(s.id) && (s._count?.mastodonPosts ?? 0) > 0)}
      />

      <StoryDetail
        storyId={detailId}
        issues={issuesQuery.data || []}
        onClose={() => setDetailId(null)}
        onBlueskyGenerate={(storyId) => {
          setBlueskyPanelOpen(true)
          setBlueskyDraft(null)
          adminApi.bluesky.generateDraft(storyId)
            .then((draft) => setBlueskyDraft(draft as BlueskyDraft))
            .catch((err) => {
              toast('error', err instanceof Error ? err.message : 'Failed to generate draft')
              setBlueskyPanelOpen(false)
            })
        }}
        onMastodonGenerate={(storyId) => {
          setMastodonPanelOpen(true)
          setMastodonDraft(null)
          adminApi.mastodon.generateDraft(storyId)
            .then((draft) => setMastodonDraft(draft as MastodonDraft))
            .catch((err) => {
              toast('error', err instanceof Error ? err.message : 'Failed to generate draft')
              setMastodonPanelOpen(false)
            })
        }}
        onInstagramGenerate={handleInstagramGenerate}
        onLinkedInGenerate={handleLinkedInGenerate}
      />

      <CrawlUrlForm open={crawlOpen} onClose={() => setCrawlOpen(false)} />

      <CreateClusterDialog
        open={clusterDialogOpen}
        onClose={() => setClusterDialogOpen(false)}
        stories={stories.filter(s => selectedIds.has(s.id))}
        onSuccess={() => setSelectedIds(new Set())}
      />

      <BlueskyDraftPanel
        open={blueskyPanelOpen}
        onClose={() => {
          setBlueskyPanelOpen(false)
          setBlueskyDraft(null)
        }}
        draft={blueskyDraft}
        onPublish={handleBlueskyPublish}
        onUpdate={handleBlueskyUpdate}
        onDelete={handleBlueskyDelete}
        publishing={blueskyPublishing}
      />

      <MastodonDraftPanel
        open={mastodonPanelOpen}
        onClose={() => {
          setMastodonPanelOpen(false)
          setMastodonDraft(null)
        }}
        draft={mastodonDraft}
        onPublish={handleMastodonPublish}
        onUpdate={handleMastodonUpdate}
        onDelete={handleMastodonDelete}
        publishing={mastodonPublishing}
      />

      <InstagramDraftPanel
        open={instagramPanelOpen}
        onClose={() => { setInstagramPanelOpen(false); setInstagramDraft(null) }}
        draft={instagramDraft}
        publishing={instagramPublishing}
        onPublish={async (postId) => {
          setInstagramPublishing(true)
          try {
            await adminApi.instagram.publishPost(postId)
            toast('success', 'Posted to Instagram')
            setInstagramPanelOpen(false)
            setInstagramDraft(null)
            invalidateStories()
          } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Failed to publish')
          } finally {
            setInstagramPublishing(false)
          }
        }}
        onUpdate={async (postId, caption) => {
          await adminApi.instagram.updateDraft(postId, caption)
        }}
        onDelete={async (postId) => {
          await adminApi.instagram.deletePost(postId)
        }}
      />

      <LinkedInDraftPanel
        open={linkedInPanelOpen}
        onClose={() => { setLinkedInPanelOpen(false); setLinkedInDraft(null) }}
        draft={linkedInDraft}
        publishing={linkedInPublishing}
        onPublish={async (postId) => {
          setLinkedInPublishing(true)
          try {
            await adminApi.linkedin.publishPost(postId)
            toast('success', 'Posted to LinkedIn')
            setLinkedInPanelOpen(false)
            setLinkedInDraft(null)
            invalidateStories()
          } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Failed to publish')
          } finally {
            setLinkedInPublishing(false)
          }
        }}
        onUpdate={async (postId, postText) => {
          await adminApi.linkedin.updateDraft(postId, postText)
        }}
        onDelete={async (postId) => {
          await adminApi.linkedin.deletePost(postId)
        }}
      />

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
