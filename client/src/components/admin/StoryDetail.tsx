import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Story } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { STATUS_VARIANTS, EMOTION_VARIANTS, formatStatus, formatDate } from '../../lib/constants'
import { StoryEditForm } from './StoryEditForm'
import { useStory } from '../../hooks/useStories'

interface StoryDetailProps {
  storyId: string | null
  onClose: () => void
}

function AIField({ label, value }: { label: string; value: string | string[] | null }) {
  if (!value) return null
  const text = Array.isArray(value) ? value.join(', ') : value
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">{label}</h4>
      <p className="text-sm text-neutral-700 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function StoryContent({ story }: { story: Story }) {
  const [editing, setEditing] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(false)

  if (editing) {
    return <StoryEditForm story={story} onDone={() => setEditing(false)} />
  }

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={STATUS_VARIANTS[story.status]}>{formatStatus(story.status)}</Badge>
          {story.emotionTag && (
            <Badge variant={EMOTION_VARIANTS[story.emotionTag]}>{story.emotionTag}</Badge>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
          <dt className="text-neutral-500">Pre-rating</dt>
          <dd className="text-neutral-900">{story.relevancePre != null ? String(story.relevancePre) : '—'}</dd>
          <dt className="text-neutral-500">Rating</dt>
          <dd className="text-neutral-900">{story.relevance != null ? String(story.relevance) : '—'}</dd>
          <dt className="text-neutral-500">Crawled</dt>
          <dd className="text-neutral-900">{formatDate(story.dateCrawled)}</dd>
          <dt className="text-neutral-500">Published</dt>
          <dd className="text-neutral-900">{formatDate(story.datePublished)}</dd>
          <dt className="text-neutral-500">Source URL</dt>
          <dd className="text-neutral-900 truncate">
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              {story.sourceUrl}
            </a>
          </dd>
        </dl>
      </div>

      {/* AI Analysis */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">AI Analysis</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
        <AIField label="Summary" value={story.summary} />
        <AIField label="Quote" value={story.quote} />
        <AIField label="Marketing Blurb" value={story.marketingBlurb} />
        <AIField label="Relevance Reasons" value={story.relevanceReasons} />
        <AIField label="Antifactors" value={story.antifactors} />
        <AIField label="Relevance Calculation" value={story.relevanceCalculation} />
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Content</h3>
        <div className={`text-sm text-neutral-700 ${!contentExpanded ? 'max-h-40 overflow-hidden relative' : ''}`}>
          <div className="whitespace-pre-wrap">{story.sourceContent}</div>
          {!contentExpanded && story.sourceContent && story.sourceContent.length > 500 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white" />
          )}
        </div>
        {story.sourceContent && story.sourceContent.length > 500 && (
          <Button variant="ghost" size="sm" onClick={() => setContentExpanded(!contentExpanded)} className="mt-1">
            {contentExpanded ? 'Show less' : 'Show more'}
          </Button>
        )}
      </div>
    </div>
  )
}

export function StoryDetail({ storyId, onClose }: StoryDetailProps) {
  const { data: story, isLoading, error } = useStory(storyId || '')

  return (
    <Dialog open={!!storyId} onClose={onClose} className="relative z-40">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <DialogPanel className="w-screen max-w-lg bg-white shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <DialogTitle className="text-lg font-semibold text-neutral-900 truncate pr-4">
              {story?.title || story?.sourceTitle || 'Story Detail'}
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5 text-neutral-500" />
            </button>
          </div>
          <div className="p-4">
            {isLoading && (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            )}
            {error && (
              <p className="text-sm text-red-600">Failed to load story details.</p>
            )}
            {story && <StoryContent story={story} />}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
