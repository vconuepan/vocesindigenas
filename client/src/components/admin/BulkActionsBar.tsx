import type { StoryStatus } from '@shared/types'
import { Button } from '../ui/Button'

interface BulkActionsBarProps {
  count: number
  onAction: (action: 'preassess' | 'assess' | 'select' | StoryStatus) => void
  loading?: boolean
}

export function BulkActionsBar({ count, onAction, loading }: BulkActionsBarProps) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-0 z-10 bg-white border-t border-neutral-200 shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-neutral-700">
        {count} selected
      </span>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => onAction('preassess')} disabled={loading}>
          Pre-assess
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('assess')} disabled={loading}>
          Assess
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('select')} disabled={loading}>
          Select
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('published')} disabled={loading}>
          Publish
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('rejected')} disabled={loading}>
          Reject
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAction('trashed')} disabled={loading}>
          Trash
        </Button>
      </div>
    </div>
  )
}
