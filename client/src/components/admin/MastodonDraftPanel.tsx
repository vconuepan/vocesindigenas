import { useState } from 'react'
import { EditPanel, PANEL_BODY, PANEL_FOOTER } from './EditPanel'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface MastodonDraft {
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

interface MastodonDraftPanelProps {
  open: boolean
  onClose: () => void
  draft: MastodonDraft | null
  onPublish: (postId: string) => Promise<void>
  onUpdate: (postId: string, text: string) => Promise<void>
  onDelete: (postId: string) => Promise<void>
  publishing?: boolean
}

const CHAR_LIMIT = 500

export function MastodonDraftPanel({
  open,
  onClose,
  draft,
  onPublish,
  onUpdate,
  onDelete,
  publishing,
}: MastodonDraftPanelProps) {
  const [editedText, setEditedText] = useState('')
  const [hasEdited, setHasEdited] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync editedText when draft changes
  const currentText = hasEdited ? editedText : (draft?.postText ?? '')
  const charCount = currentText.length
  const isOverLimit = charCount > CHAR_LIMIT
  const isNearLimit = charCount > CHAR_LIMIT - 20

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
    <EditPanel open={open} onClose={handleClose} title="Post to Mastodon" loading={!draft && open}>
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
              <label htmlFor="mastodon-post-text" className="block text-sm font-medium text-neutral-700 mb-1">
                Post text
              </label>
              <textarea
                id="mastodon-post-text"
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={7}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-400">
                  Link preview auto-generated from URL
                </span>
                <span
                  className={`text-xs font-medium ${
                    isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-neutral-500'
                  }`}
                >
                  {charCount}/{CHAR_LIMIT}
                </span>
              </div>
            </div>

            {/* Posting info */}
            <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">
                Visibility: <span className="font-medium text-neutral-700">unlisted</span> · Mastodon will auto-generate a link preview from the URL in the post text.
              </p>
            </div>
          </div>

          <div className={PANEL_FOOTER}>
            <Button
              onClick={handlePublish}
              disabled={isOverLimit || publishing || saving || !currentText.trim()}
              loading={publishing || saving}
            >
              {publishing ? 'Publishing...' : saving ? 'Saving...' : 'Post to Mastodon'}
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
