import { useState } from 'react'
import type { Newsletter, NewsletterSend } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import {
  useUpdateNewsletter,
  useAssignNewsletterStories,
  useSelectNewsletterStories,
  useGenerateNewsletter,
  useGenerateCarousel,
  useGenerateHtml,
  useSendTestNewsletter,
  useSendLiveNewsletter,
  useNewsletterSends,
  useRefreshSendStats,
} from '../../hooks/useNewsletters'
import { useToast } from '../ui/Toast'
import { AssignedStoriesList } from './AssignedStoriesList'
import type { StoryListAction } from './AssignedStoriesList'

interface NewsletterDetailProps {
  newsletter: Newsletter
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function SendStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'green' | 'yellow' | 'red' | 'gray' | 'blue'> = {
    sent: 'green',
    sending: 'blue',
    scheduled: 'yellow',
    failed: 'red',
    draft: 'gray',
  }
  return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
}

function StatsDisplay({ stats }: { stats: Record<string, unknown> }) {
  const delivered = (stats.delivered as number) ?? 0
  const opened = (stats.opened as number) ?? 0
  const clicked = (stats.clicked as number) ?? 0
  const bounced = (stats.bounced as number) ?? 0

  if (!delivered && !opened && !clicked && !bounced) {
    return <span className="text-neutral-400 text-xs">No stats yet</span>
  }

  return (
    <div className="flex gap-3 text-xs text-neutral-600">
      <span>{delivered} delivered</span>
      <span>{opened} opened</span>
      <span>{clicked} clicked</span>
      {bounced > 0 && <span className="text-red-600">{bounced} bounced</span>}
    </div>
  )
}

function SendHistory({ newsletterId }: { newsletterId: string }) {
  const { data: sends, isLoading } = useNewsletterSends(newsletterId)
  const refreshStats = useRefreshSendStats()
  const { toast } = useToast()

  if (isLoading) return <p className="text-neutral-400 text-sm">Loading send history...</p>
  if (!sends || sends.length === 0) return <p className="text-neutral-400 text-sm italic">No sends yet.</p>

  return (
    <div className="space-y-2">
      {sends.map((send: NewsletterSend) => (
        <div key={send.id} className="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-lg text-sm">
          <div className="flex items-center gap-3 min-w-0">
            <SendStatusBadge status={send.status} />
            {send.isTest && <Badge variant="gray">Test</Badge>}
            <span className="text-neutral-500 text-xs whitespace-nowrap">{formatDate(send.createdAt)}</span>
            <StatsDisplay stats={send.stats as Record<string, unknown>} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshStats.mutate(
              { newsletterId, sendId: send.id },
              {
                onSuccess: () => toast('success', 'Stats refreshed'),
                onError: () => toast('error', 'Failed to refresh stats'),
              },
            )}
            loading={refreshStats.isPending}
          >
            Refresh Stats
          </Button>
        </div>
      ))}
    </div>
  )
}

export function NewsletterDetail({ newsletter }: NewsletterDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(newsletter.title)
  const [editingContent, setEditingContent] = useState(false)
  const [content, setContent] = useState(newsletter.content)
  const [html, setHtml] = useState(newsletter.html)
  const [editingHtml, setEditingHtml] = useState(false)
  const { toast } = useToast()

  const update = useUpdateNewsletter()
  const assign = useAssignNewsletterStories()
  const selectStories = useSelectNewsletterStories()
  const generate = useGenerateNewsletter()
  const carousel = useGenerateCarousel()
  const generateHtml = useGenerateHtml()
  const sendTest = useSendTestNewsletter()
  const sendLive = useSendLiveNewsletter()

  // Track whether local edits differ from server state
  const hasContentChanges = content !== newsletter.content
  const hasHtmlChanges = html !== newsletter.html
  const hasUnsavedChanges = hasContentChanges || hasHtmlChanges

  const handleSaveTitle = async () => {
    try {
      await update.mutateAsync({ id: newsletter.id, data: { title } })
      toast('success', 'Title updated')
      setEditingTitle(false)
    } catch { toast('error', 'Failed to update title') }
  }

  const handleSave = async () => {
    const data: { content?: string; html?: string } = {}
    if (hasContentChanges) data.content = content
    if (hasHtmlChanges) data.html = html
    try {
      await update.mutateAsync({ id: newsletter.id, data })
      toast('success', 'Changes saved')
      setEditingContent(false)
      setEditingHtml(false)
    } catch { toast('error', 'Failed to save changes') }
  }

  const handleCancel = () => {
    setContent(newsletter.content)
    setHtml(newsletter.html)
    setEditingContent(false)
    setEditingHtml(false)
  }

  const handlePublishToggle = async () => {
    const newStatus = newsletter.status === 'published' ? 'draft' : 'published'
    try {
      await update.mutateAsync({ id: newsletter.id, data: { status: newStatus } })
      toast('success', newStatus === 'published' ? 'Newsletter published' : 'Newsletter unpublished')
    } catch { toast('error', 'Failed to update status') }
  }

  const handleGenerateContent = () => {
    generate.mutate(newsletter.id, {
      onSuccess: (result) => {
        setContent(result.content)
        toast('success', 'Content generated')
      },
      onError: () => toast('error', 'Generation failed'),
    })
  }

  const handleGenerateHtml = async () => {
    try {
      const result = await generateHtml.mutateAsync(newsletter.id)
      setHtml(result.html)
      toast('success', 'HTML generated')
    } catch { toast('error', 'Failed to generate HTML') }
  }

  const handleSendTest = async () => {
    try {
      await sendTest.mutateAsync(newsletter.id)
      toast('success', 'Test email sent')
    } catch { toast('error', 'Failed to send test email') }
  }

  const handleSendLive = async () => {
    if (!confirm('This will send the newsletter to all subscribers. This cannot be undone. Continue?')) return
    try {
      await sendLive.mutateAsync({ id: newsletter.id })
      toast('success', 'Newsletter sent to subscribers')
    } catch { toast('error', 'Failed to send newsletter') }
  }

  const handleSelectStory = (storyId: string) => {
    const newSelected = [...newsletter.selectedStoryIds, storyId]
    const newLonglist = newsletter.storyIds.filter(id => id !== storyId)
    update.mutate(
      { id: newsletter.id, data: { storyIds: newLonglist, selectedStoryIds: newSelected } },
      {
        onSuccess: () => toast('success', 'Story selected'),
        onError: () => toast('error', 'Failed to select story'),
      },
    )
  }

  const handleDiscardStory = (storyId: string) => {
    const newLonglist = newsletter.storyIds.filter(id => id !== storyId)
    update.mutate(
      { id: newsletter.id, data: { storyIds: newLonglist } },
      {
        onSuccess: () => toast('success', 'Story discarded'),
        onError: () => toast('error', 'Failed to discard story'),
      },
    )
  }

  const handleRemoveSelected = (storyId: string) => {
    const newSelected = newsletter.selectedStoryIds.filter(id => id !== storyId)
    update.mutate(
      { id: newsletter.id, data: { selectedStoryIds: newSelected } },
      {
        onSuccess: () => toast('success', 'Story removed from selection'),
        onError: () => toast('error', 'Failed to remove story'),
      },
    )
  }

  const longlistActions: StoryListAction[] = [
    { icon: 'select' as const, title: 'Select for newsletter', onClick: handleSelectStory },
    { icon: 'discard' as const, title: 'Discard from longlist', onClick: handleDiscardStory },
  ]

  const selectedActions: StoryListAction[] = [
    { icon: 'discard' as const, title: 'Remove from selection', onClick: handleRemoveSelected },
  ]

  return (
    <>
    <div className="max-w-3xl space-y-6">
        {/* Title + Status */}
        <div>
          {editingTitle ? (
            <div className="flex gap-2">
              <Input id="nl-title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleSaveTitle} loading={update.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitle(newsletter.title) }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant={newsletter.status === 'published' ? 'green' : 'gray'}>
                {newsletter.status === 'published' ? 'Published' : 'Draft'}
              </Badge>
              <h1 className="text-xl font-bold text-neutral-900">{newsletter.title}</h1>
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="shrink-0 p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-500"
                title="Rename"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => assign.mutate(newsletter.id, {
            onSuccess: () => toast('success', 'Longlist generated'),
            onError: () => toast('error', 'Failed to generate longlist'),
          })} loading={assign.isPending}>
            Generate Longlist
          </Button>
          <Button variant="secondary" size="sm" onClick={() => selectStories.mutate(newsletter.id, {
            onSuccess: () => toast('success', 'Stories selected'),
            onError: () => toast('error', 'Selection failed'),
          })} loading={selectStories.isPending}>
            {selectStories.isPending ? 'Selecting... (this may take a minute)' : 'Select Stories'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => carousel.mutate(newsletter.id, {
            onSuccess: () => toast('success', 'Carousel downloaded'),
            onError: () => toast('error', 'Carousel generation failed'),
          })} loading={carousel.isPending}>
            {carousel.isPending ? 'Generating... (this may take a minute)' : 'Download Carousel ZIP'}
          </Button>
          <Button variant={newsletter.status === 'published' ? 'ghost' : 'primary'} size="sm" onClick={handlePublishToggle} loading={update.isPending}>
            {newsletter.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>

        {/* Selected stories */}
        <AssignedStoriesList
          label="Selected Stories"
          storyIds={newsletter.selectedStoryIds}
          emptyText="No stories selected yet. Use 'Select Stories' or manually select from the longlist."
          actions={selectedActions}
          isActioning={update.isPending}
          collapsible={false}
        />

        {/* Story Longlist */}
        <AssignedStoriesList
          label="Story Longlist"
          storyIds={newsletter.storyIds}
          emptyText="No stories in longlist. Click 'Generate Longlist' to fetch recent published stories."
          actions={longlistActions}
          isActioning={update.isPending}
          defaultExpanded={newsletter.selectedStoryIds.length === 0}
        />

        {/* Content */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Content</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleGenerateContent} loading={generate.isPending}>
                {generate.isPending ? 'Generating...' : 'Generate Content'}
              </Button>
              {!editingContent && (
                <Button variant="ghost" size="sm" onClick={() => { setContent(newsletter.content); setEditingContent(true) }}>Edit</Button>
              )}
            </div>
          </div>
          {editingContent ? (
            <Textarea id="nl-content" rows={20} value={content} onChange={e => setContent(e.target.value)} />
          ) : (
            <div className="text-sm text-neutral-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {content || <span className="text-neutral-400 italic">No content yet. Generate or edit manually.</span>}
            </div>
          )}
        </div>

        {/* Email HTML */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Email HTML</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleGenerateHtml} loading={generateHtml.isPending}>
                {generateHtml.isPending ? 'Generating...' : 'Generate HTML'}
              </Button>
              {!editingHtml && html && (
                <Button variant="ghost" size="sm" onClick={() => setEditingHtml(true)}>Edit</Button>
              )}
            </div>
          </div>
          {editingHtml ? (
            <Textarea id="nl-html" rows={20} value={html} onChange={e => setHtml(e.target.value)} className="font-mono text-xs" />
          ) : html ? (
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full h-[500px] border border-neutral-200 rounded bg-white"
              sandbox=""
            />
          ) : (
            <p className="text-neutral-400 italic text-sm">Click "Generate HTML" to create the email template from the content above.</p>
          )}
        </div>

        {/* Send */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Send</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="secondary" size="sm" onClick={handleSendTest} loading={sendTest.isPending}>
              {sendTest.isPending ? 'Sending...' : 'Send Test'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSendLive} loading={sendLive.isPending}>
              {sendLive.isPending ? 'Sending...' : 'Send to Subscribers'}
            </Button>
          </div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Send History</h4>
          <SendHistory newsletterId={newsletter.id} />
        </div>
    </div>

      {/* Fixed bottom save bar */}
      <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-10 bg-white border-t border-neutral-200 shadow-lg px-4 py-3 flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={!hasUnsavedChanges || update.isPending}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={update.isPending} disabled={!hasUnsavedChanges}>Save</Button>
      </div>
      {/* Spacer for fixed bar */}
      <div className="h-14" />
    </>
  )
}
