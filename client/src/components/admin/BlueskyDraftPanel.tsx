import { useState } from 'react'
import { EditPanel, PANEL_BODY, PANEL_FOOTER } from './EditPanel'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface BlueskyDraft {
  id: string
  postText: string
  story: {
    title: string | null
    titleLabel: string | null
    sourceUrl: string
    slug: string | null
    issue?: { name: string } | null
    relevance?: number | null
    feed: { title: string; displayTitle: string | null }
  }
  pickReasoning?: string
}

interface BlueskyDraftPanelProps {
  open: boolean
  onClose: () => void
  draft: BlueskyDraft | null
  onPublish: (postId: string) => Promise<void>
  onUpdate: (postId: string, text: string) => Promise<void>
  onDelete: (postId: string) => Promise<void>
  publishing?: boolean
}

/** Count graphemes (user-perceived characters) using Intl.Segmenter. */
function countGraphemes(text: string): number {
  // Intl.Segmenter is widely supported but not in all TS lib targets
  const IntlAny = Intl as any
  if (typeof IntlAny.Segmenter === 'function') {
    const segmenter = new IntlAny.Segmenter('en', { granularity: 'grapheme' })
    return [...segmenter.segment(text)].length
  }
  // Fallback: spread into array (handles most emoji correctly)
  return [...text].length
}

export function BlueskyDraftPanel({
  open,
  onClose,
  draft,
  onPublish,
  onUpdate,
  onDelete,
  publishing,
}: BlueskyDraftPanelProps) {
  const [editedText, setEditedText] = useState('')
  const [hasEdited, setHasEdited] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync editedText when draft changes
  const currentText = hasEdited ? editedText : (draft?.postText ?? '')
  const graphemeCount = countGraphemes(currentText)
  const isOverLimit = graphemeCount > 300
  const isNearLimit = graphemeCount > 280

  const handleTextChange = (value: string) => {
    setEditedText(value)
    setHasEdited(true)
  }

  const handlePublish = async () => {
    if (!draft) return
    try {
      if (hasEdited && editedText !== draft.postText) {
        setSaving(true)
        await onUpdate(draft.id, editedText)
        setSaving(false)
      }
      await onPublish(draft.id)
    } catch {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (draft) {
      try {
        await onDelete(draft.id)
      } catch {
        // Ignore deletion errors on cancel
      }
    }
    setHasEdited(false)
    onClose()
  }

  const handleClose = () => {
    setHasEdited(false)
    onClose()
  }

  return (
    <EditPanel open={open} onClose={handleClose} title="Post to Bluesky" loading={!draft && open}>
      {draft && (
        <div className="flex flex-col h-full">
          <div className={PANEL_BODY}>
            {/* Pick reasoning */}
            {draft.pickReasoning && (
              <div className="rounded-md bg-brand-50 border border-brand-200 p-3 text-sm text-brand-800">
                <span className="font-medium">Selected story: </span>
                {draft.pickReasoning}
              </div>
            )}

            {/* Story context */}
            <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 space-y-1">
              <p className="text-sm font-medium text-neutral-900">
                {draft.story.titleLabel && (
                  <span className="text-brand-600">{draft.story.titleLabel} — </span>
                )}
                {draft.story.title || 'Untitled'}
              </p>
              <p className="text-xs text-neutral-500">
                {draft.story.feed.displayTitle || draft.story.feed.title}
                {draft.story.issue && <> · {draft.story.issue.name}</>}
                {draft.story.relevance != null && <> · Relevance: {draft.story.relevance}/10</>}
              </p>
            </div>

            {/* Post text editor */}
            <div>
              <label htmlFor="bluesky-post-text" className="block text-sm font-medium text-neutral-700 mb-1">
                Post text
              </label>
              <textarea
                id="bluesky-post-text"
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-400">
                  Links are added automatically
                </span>
                <span
                  className={`text-xs font-medium ${
                    isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-neutral-500'
                  }`}
                >
                  {graphemeCount}/300
                </span>
              </div>
            </div>

            {/* Link preview */}
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Links</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-neutral-400">Card:</span>
                  <span className="text-brand-700 break-all">
                    actuallyrelevant.com/stories/{draft.story.slug || '...'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-neutral-400">Source:</span>
                  <span className="text-neutral-600 break-all">{draft.story.sourceUrl}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={PANEL_FOOTER}>
            <Button
              onClick={handlePublish}
              disabled={isOverLimit || publishing || saving || !currentText.trim()}
              loading={publishing || saving}
            >
              {publishing ? 'Publishing...' : saving ? 'Saving...' : 'Post to Bluesky'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={publishing || saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!draft && open && (
        <div className="flex-1 flex justify-center items-start pt-12">
          <LoadingSpinner />
        </div>
      )}
    </EditPanel>
  )
}
