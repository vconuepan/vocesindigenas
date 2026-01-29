import { useState } from 'react'
import type { Newsletter } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useUpdateNewsletter, useAssignNewsletterStories, useGenerateNewsletter, useGenerateCarousel } from '../../hooks/useNewsletters'
import { useToast } from '../ui/Toast'

interface NewsletterDetailProps {
  newsletter: Newsletter
}

export function NewsletterDetail({ newsletter }: NewsletterDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(newsletter.title)
  const [editingContent, setEditingContent] = useState(false)
  const [content, setContent] = useState(newsletter.content)
  const { toast } = useToast()

  const update = useUpdateNewsletter()
  const assign = useAssignNewsletterStories()
  const generate = useGenerateNewsletter()
  const carousel = useGenerateCarousel()

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

      {/* Story count */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-1">Assigned Stories</h3>
        <p className="text-sm text-neutral-600">{newsletter.storyIds.length} stories assigned</p>
      </div>

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
    </div>
  )
}
