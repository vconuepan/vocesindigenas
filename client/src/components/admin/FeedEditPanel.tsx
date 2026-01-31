import { useMemo, useState } from 'react'
import type { Issue } from '@shared/types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { FeedFaviconPreview } from '../FeedFavicon'
import { useFeed, useUpdateFeed } from '../../hooks/useFeeds'
import { useEditForm } from '../../hooks/useEditForm'
import { adminApi } from '../../lib/admin-api'
import { useToast } from '../ui/Toast'
import { EditPanel, PANEL_BODY } from './EditPanel'
import { PanelFooter } from './PanelFooter'
import { buildIssueOptions } from './FeedForm'

interface FeedEditPanelProps {
  feedId: string | null
  issues: Issue[]
  onClose: () => void
}

function buildFormState(feed: { title: string; url: string; issueId: string; language: string; crawlIntervalHours: number; htmlSelector: string | null; active: boolean }) {
  return {
    title: feed.title,
    url: feed.url,
    issueId: feed.issueId,
    language: feed.language,
    crawlIntervalHours: String(feed.crawlIntervalHours),
    htmlSelector: feed.htmlSelector || '',
    active: feed.active,
  }
}

function FaviconSection({ feedId }: { feedId: string }) {
  const [fetching, setFetching] = useState(false)
  const [imgKey, setImgKey] = useState(0)
  const { toast } = useToast()
  const isDev = import.meta.env.DEV

  const handleFetch = async () => {
    setFetching(true)
    try {
      const result = await adminApi.feeds.fetchFavicon(feedId)
      if (result.success) {
        setImgKey(k => k + 1)
        toast('success', 'Favicon fetched')
      } else {
        toast('error', result.message)
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to fetch favicon')
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <FeedFaviconPreview feedId={feedId} imgKey={imgKey} size={24} />
      {isDev ? (
        <Button type="button" variant="ghost" size="sm" onClick={handleFetch} disabled={fetching}>
          {fetching ? 'Fetching...' : 'Fetch Favicon'}
        </Button>
      ) : (
        <span className="text-xs text-neutral-400">Fetch in dev only</span>
      )}
    </div>
  )
}

function FeedEditForm({ feedId, issues, onClose }: { feedId: string; issues: Issue[]; onClose: () => void }) {
  const { data: feed } = useFeed(feedId)
  const updateFeed = useUpdateFeed()

  const initialState = useMemo(() => buildFormState(feed!), [feed])

  const { form, set, isDirty, isPending, handleSubmit } = useEditForm({
    entityId: feedId,
    initialState,
    mutation: updateFeed,
    toPayload: (f) => ({
      title: f.title,
      url: f.url,
      issueId: f.issueId,
      language: f.language,
      crawlIntervalHours: Number(f.crawlIntervalHours),
      htmlSelector: f.htmlSelector || null,
      active: f.active,
    }),
    successMessage: 'Feed updated',
    entityName: 'feed',
    onSuccess: onClose,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className={PANEL_BODY}>
        <Input id="feed-title" label="Title" value={form.title} onChange={e => set('title', e.target.value)} required />
        <Input id="feed-url" label="URL" type="url" value={form.url} onChange={e => set('url', e.target.value)} required />
        <Select
          id="feed-issue"
          label="Issue"
          placeholder="Select issue"
          value={form.issueId}
          onChange={e => set('issueId', e.target.value)}
          options={buildIssueOptions(issues)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input id="feed-lang" label="Language" value={form.language} onChange={e => set('language', e.target.value)} />
          <Input id="feed-interval" label="Interval (hours)" type="number" min="1" value={form.crawlIntervalHours} onChange={e => set('crawlIntervalHours', e.target.value)} />
        </div>
        <Input id="feed-selector" label="HTML Selector (optional)" value={form.htmlSelector} onChange={e => set('htmlSelector', e.target.value)} placeholder="e.g. article .content" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          Active
        </label>
        <FaviconSection feedId={feedId} />
      </div>
      <PanelFooter isPending={isPending} isDirty={isDirty} onCancel={onClose} />
    </form>
  )
}

export function FeedEditPanel({ feedId, issues, onClose }: FeedEditPanelProps) {
  const { data: feed, isLoading, error } = useFeed(feedId || '')

  return (
    <EditPanel
      open={!!feedId}
      onClose={onClose}
      title={feed?.title || 'Feed'}
      loading={isLoading}
      error={!!error}
    >
      {feed && <FeedEditForm feedId={feedId!} issues={issues} onClose={onClose} />}
    </EditPanel>
  )
}
