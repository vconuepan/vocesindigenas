import type { StoryStatus } from '@shared/types'
import { Button } from '../ui/Button'

interface BulkActionsBarProps {
  count: number
  onAction: (action: 'preassess' | 'reclassify' | 'assess' | 'select' | StoryStatus) => void
  loading?: boolean
  allHaveRelevance?: boolean
}

const RELEVANCE_TOOLTIP = 'All stories must have a relevance rating'
const SELECT_MIN_TOOLTIP = 'Select at least 2 stories to compare'

export function BulkActionsBar({ count, onAction, loading, allHaveRelevance }: BulkActionsBarProps) {
  if (count === 0) return null

  const needsRelevance = !allHaveRelevance
  const tooFewForSelect = count < 2
  const selectDisabled = loading || needsRelevance || tooFewForSelect
  const selectTooltip = tooFewForSelect ? SELECT_MIN_TOOLTIP : needsRelevance ? RELEVANCE_TOOLTIP : undefined

  return (
    <div className="sticky bottom-0 z-10 bg-white border-t border-neutral-200 shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-neutral-700">
        {count} selected
      </span>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => onAction('preassess')} disabled={loading}>
          Pre-assess
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('reclassify')} disabled={loading}>
          Reclassify
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('assess')} disabled={loading}>
          Assess
        </Button>
        <span title={needsRelevance ? RELEVANCE_TOOLTIP : undefined}>
          <Button variant="secondary" size="sm" onClick={() => onAction('analyzed')} disabled={loading || needsRelevance}>
            Set to Analyzed
          </Button>
        </span>
        <span title={selectTooltip}>
          <Button variant="secondary" size="sm" onClick={() => onAction('select')} disabled={selectDisabled}>
            Select
          </Button>
        </span>
        <span title={needsRelevance ? RELEVANCE_TOOLTIP : undefined}>
          <Button variant="secondary" size="sm" onClick={() => onAction('published')} disabled={loading || needsRelevance}>
            Publish
          </Button>
        </span>
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
