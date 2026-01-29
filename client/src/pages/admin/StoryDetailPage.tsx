import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useStory, useAssessStory, usePublishStory, useRejectStory, useDeleteStory } from '../../hooks/useStories'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StoryEditForm } from '../../components/admin/StoryEditForm'
import { useToast } from '../../components/ui/Toast'
import { STATUS_VARIANTS, EMOTION_VARIANTS, formatStatus, formatDate } from '../../lib/constants'
import { useState } from 'react'
import type { Story } from '@shared/types'

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

function StoryFullDetail({ story }: { story: Story }) {
  const [editing, setEditing] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(false)
  const navigate = useNavigate()
  const assess = useAssessStory()
  const publish = usePublishStory()
  const reject = useRejectStory()
  const deleteStory = useDeleteStory()
  const { toast } = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (editing) {
    return <StoryEditForm story={story} onDone={() => setEditing(false)} />
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        {story.status === 'fetched' && (
          <Button variant="secondary" size="sm" loading={assess.isPending}
            onClick={() => assess.mutate(story.id, {
              onSuccess: () => toast('success', 'Assessment complete'),
              onError: () => toast('error', 'Assessment failed'),
            })}>
            Assess
          </Button>
        )}
        {story.status !== 'published' && (
          <Button variant="secondary" size="sm" loading={publish.isPending}
            onClick={() => publish.mutate(story.id, {
              onSuccess: () => toast('success', 'Story published'),
              onError: () => toast('error', 'Publish failed'),
            })}>
            Publish
          </Button>
        )}
        {story.status !== 'rejected' && (
          <Button variant="secondary" size="sm" loading={reject.isPending}
            onClick={() => reject.mutate(story.id, {
              onSuccess: () => toast('success', 'Story rejected'),
              onError: () => toast('error', 'Reject failed'),
            })}>
            Reject
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>Delete</Button>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={STATUS_VARIANTS[story.status]}>{formatStatus(story.status)}</Badge>
          {story.emotionTag && <Badge variant={EMOTION_VARIANTS[story.emotionTag]}>{story.emotionTag}</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">Rating</dt>
          <dd>{story.relevanceRatingLow != null && story.relevanceRatingHigh != null
                ? `${story.relevanceRatingLow}–${story.relevanceRatingHigh}`
                : story.relevanceRatingLow != null
                  ? String(story.relevanceRatingLow)
                  : '—'}</dd>
          <dt className="text-neutral-500">Crawled</dt>
          <dd>{formatDate(story.dateCrawled)}</dd>
          <dt className="text-neutral-500">Published</dt>
          <dd>{formatDate(story.datePublished)}</dd>
          <dt className="text-neutral-500">Crawl Method</dt>
          <dd>{story.crawlMethod || '—'}</dd>
          <dt className="text-neutral-500">URL</dt>
          <dd className="col-span-1 truncate">
            <a href={story.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">{story.url}</a>
          </dd>
        </dl>
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">AI Analysis</h3>
        <AIField label="Summary" value={story.aiSummary} />
        <AIField label="Quote" value={story.aiQuote} />
        <AIField label="Keywords" value={story.aiKeywords} />
        <AIField label="Marketing Blurb" value={story.aiMarketingBlurb} />
        <AIField label="Relevance Reasons" value={story.aiRelevanceReasons} />
        <AIField label="Antifactors" value={story.aiAntifactors} />
        <AIField label="Relevance Calculation" value={story.aiRelevanceCalculation} />
        <AIField label="Future Scenarios" value={story.aiScenarios} />
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Content</h3>
        <div className={`text-sm text-neutral-700 ${!contentExpanded ? 'max-h-60 overflow-hidden relative' : ''}`}>
          <div className="whitespace-pre-wrap">{story.content}</div>
          {!contentExpanded && story.content?.length > 500 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white" />
          )}
        </div>
        {story.content?.length > 500 && (
          <Button variant="ghost" size="sm" onClick={() => setContentExpanded(!contentExpanded)} className="mt-1">
            {contentExpanded ? 'Show less' : 'Show more'}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={async () => {
          await deleteStory.mutateAsync(story.id)
          toast('success', 'Story deleted')
          navigate('/admin/stories')
        }}
        title="Delete story?"
        description="This action cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        loading={deleteStory.isPending}
      />
    </div>
  )
}

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: story, isLoading, error, refetch } = useStory(id || '')

  return (
    <>
      <Helmet>
        <title>{story?.title || 'Story'} — Admin — Actually Relevant</title>
      </Helmet>

      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/stories')}>
          <ArrowLeftIcon className="h-4 w-4" /> Back to Stories
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {error && <ErrorState message="Failed to load story" onRetry={refetch} />}

      {story && (
        <>
          <PageHeader title={story.title} />
          <StoryFullDetail story={story} />
        </>
      )}
    </>
  )
}
