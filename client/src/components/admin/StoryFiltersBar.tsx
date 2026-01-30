import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FunnelIcon } from '@heroicons/react/24/outline'
import { STORY_STATUSES, EMOTION_TAGS } from '@shared/constants'
import { Select } from '../ui/Select'
import { formatStatus } from '../../lib/constants'
import type { Issue, Feed } from '@shared/types'

interface StoryFiltersBarProps {
  issues: Issue[]
  feeds: Feed[]
}

export function StoryFiltersBar({ issues, feeds }: StoryFiltersBarProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [expanded, setExpanded] = useState(false)

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    // Reset to page 1 on filter change
    next.delete('page')
    setSearchParams(next)
  }

  // Count active filters (excluding default sort)
  const activeCount = [
    searchParams.get('status'),
    searchParams.get('issueId'),
    searchParams.get('feedId'),
    searchParams.get('emotionTag'),
  ].filter(Boolean).length

  return (
    <div className="mb-4">
      {/* Mobile toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="md:hidden flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
      >
        <FunnelIcon className="h-4 w-4" />
        Filters{activeCount > 0 && ` (${activeCount})`}
        <svg className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters — always visible on md+, toggleable on mobile */}
      <div className={`flex flex-wrap gap-3 ${expanded ? '' : 'hidden md:flex'}`}>
        <Select
          id="filter-status"
          label="Status"
          placeholder="All (excl. trashed)"
          value={searchParams.get('status') || ''}
          onChange={e => setFilter('status', e.target.value)}
          options={[
            ...STORY_STATUSES.map(s => ({ value: s, label: formatStatus(s) })),
            { value: 'all', label: 'All (incl. trashed)' },
          ]}
        />
        <Select
          id="filter-issue"
          label="Issue"
          placeholder="All issues"
          value={searchParams.get('issueId') || ''}
          onChange={e => setFilter('issueId', e.target.value)}
          options={issues.map(i => ({ value: i.id, label: i.name }))}
        />
        <Select
          id="filter-feed"
          label="Feed"
          placeholder="All feeds"
          value={searchParams.get('feedId') || ''}
          onChange={e => setFilter('feedId', e.target.value)}
          options={feeds.map(f => ({ value: f.id, label: f.title }))}
        />
        <Select
          id="filter-emotion"
          label="Emotion"
          placeholder="All emotions"
          value={searchParams.get('emotionTag') || ''}
          onChange={e => setFilter('emotionTag', e.target.value)}
          options={EMOTION_TAGS.map(e => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
        />
        <Select
          id="filter-sort"
          label="Sort"
          value={searchParams.get('sort') || 'date_desc'}
          onChange={e => setFilter('sort', e.target.value)}
          options={[
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'rating_desc', label: 'Highest rating' },
            { value: 'rating_asc', label: 'Lowest rating' },
            { value: 'title_asc', label: 'Title A-Z' },
            { value: 'title_desc', label: 'Title Z-A' },
          ]}
        />
      </div>
    </div>
  )
}
