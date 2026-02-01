import { useState } from 'react'
import type { Newsletter, NewsletterSend } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import {
  useUpdateNewsletter,
  useAssignNewsletterStories,
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
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const update = useUpdateNewsletter()
  const assign = useAssignNewsletterStories()
  const generate = useGenerateNewsletter()
  const carousel = useGenerateCarousel()
  const generateHtml = useGenerateHtml()
  const sendTest = useSendTestNewsletter()
  const sendLive = useSendLiveNewsletter()

  const handleSaveTitle = async () => {
    try {
      await update.mutateAsync({ id: newsletter.id, data: { title } })
      toast('success', 'Title updated')
      setEditingTitle(false)
    } catch { toast('error', 'Failed to update title') }
  }

  const handleSaveContent = async () => {
    try {
      await update.mutateAsync({ id: newsletter.id, data: { content } })
      toast('success', 'Content updated')
      setEditingContent(false)
    } catch { toast('error', 'Failed to update content') }
  }

  const handlePublishToggle = async () => {
    const newStatus = newsletter.status === 'published' ? 'draft' : 'published'
    try {
      await update.mutateAsync({ id: newsletter.id, data: { status: newStatus } })
      toast('success', newStatus === 'published' ? 'Newsletter published' : 'Newsletter unpublished')
    } catch { toast('error', 'Failed to update status') }
  }

  const handleGenerateHtml = async () => {
    try {
      const result = await generateHtml.mutateAsync(newsletter.id)
      setHtmlPreview(result.html)
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

  return (
    <div className="max-w-3xl space-y-6">
      {/* Title */}
      <div className="flex items-start gap-3">
        {editingTitle ? (
          <div className="flex-1 flex gap-2">
            <Input id="nl-title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={handleSaveTitle} loading={update.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitle(newsletter.title) }}>Cancel</Button>
          </div>
        ) : (
          <>
            <Badge variant={newsletter.status === 'published' ? 'green' : 'gray'}>
              {newsletter.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setEditingTitle(true)}>Edit title</Button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => assign.mutate(newsletter.id, {
          onSuccess: () => toast('success', 'Stories assigned'),
          onError: () => toast('error', 'Failed to assign stories'),
        })} loading={assign.isPending}>
          Assign Stories
        </Button>
        <Button variant="secondary" size="sm" onClick={() => generate.mutate(newsletter.id, {
          onSuccess: () => toast('success', 'Content generated'),
          onError: () => toast('error', 'Generation failed'),
        })} loading={generate.isPending}>
          {generate.isPending ? 'Generating... (this may take a minute)' : 'Generate Content'}
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

      {/* Assigned stories */}
      <AssignedStoriesList storyIds={newsletter.storyIds} />

      {/* Content */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">Content</h3>
          {!editingContent && (
            <Button variant="ghost" size="sm" onClick={() => { setContent(newsletter.content); setEditingContent(true) }}>Edit</Button>
          )}
        </div>
        {editingContent ? (
          <div className="space-y-3">
            <Textarea id="nl-content" rows={20} value={content} onChange={e => setContent(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveContent} loading={update.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingContent(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {newsletter.content || <span className="text-neutral-400 italic">No content yet. Generate or edit manually.</span>}
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
          </div>
        </div>
        {htmlPreview ? (
          <iframe
            srcDoc={htmlPreview}
            title="Email preview"
            className="w-full h-[500px] border border-neutral-200 rounded bg-white"
            sandbox="allow-same-origin"
          />
        ) : (
          <p className="text-neutral-400 italic text-sm">Click "Generate HTML" to preview the email.</p>
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
  )
}
