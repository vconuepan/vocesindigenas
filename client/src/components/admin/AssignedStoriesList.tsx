import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { Story } from '@shared/types'
import { getTopLevelIssue } from '../../lib/issues'
import { adminApi } from '../../lib/admin-api'
import { Badge } from '../ui/Badge'
import { EMOTION_VARIANTS, formatShortDate } from '../../lib/constants'

export interface StoryListAction {
  icon: 'select' | 'discard'
  title: string
  onClick: (storyId: string) => void
}

interface AssignedStoriesListProps {
  label: string
  storyIds: string[]
  emptyText?: string
  actions?: StoryListAction[]
  isActioning?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

function groupByIssue(stories: Story[]): { issue: { id: string; name: string } | null; stories: Story[] }[] {
  const groups = new Map<string, { issue: { id: string; name: string } | null; stories: Story[] }>()

  for (const story of stories) {
    const topIssue = getTopLevelIssue(story)
    const key = topIssue?.id ?? '__none__'
    const group = groups.get(key)
    if (group) {
      group.stories.push(story)
    } else {
      groups.set(key, { issue: topIssue, stories: [story] })
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.issue) return 1
    if (!b.issue) return -1
    return a.issue.name.localeCompare(b.issue.name)
  })
}

function ratingDisplay(story: Story): string {
  if (story.relevance != null) return String(story.relevance)
  if (story.relevancePre != null) return `(${story.relevancePre})`
  return '—'
}

function SelectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function DiscardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const ACTION_ICONS = {
  select: SelectIcon,
  discard: DiscardIcon,
} as const

const ACTION_STYLES = {
  select: 'text-neutral-400 hover:text-green-600 hover:bg-green-50',
  discard: 'text-neutral-400 hover:text-red-600 hover:bg-red-50',
} as const

export function AssignedStoriesList({
  label,
  storyIds,
  emptyText = 'No stories yet.',
  actions,
  isActioning,
  collapsible = true,
  defaultExpanded = false,
}: AssignedStoriesListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isOpen = !collapsible || expanded
  const idsKey = useMemo(() => [...storyIds].sort().join(','), [storyIds])

  const { data: stories, isLoading, isError, refetch } = useQuery({
    queryKey: ['stories', 'batch', idsKey],
    queryFn: () => adminApi.stories.batch(storyIds),
    enabled: isOpen && storyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const grouped = useMemo(() => stories ? groupByIssue(stories) : [], [stories])

  const header = (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm font-semibold text-neutral-900">
        {label}: {storyIds.length}
      </span>
      {collapsible && (
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      {collapsible ? (
        <button
          type="button"
          className="w-full text-left focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {header}
        </button>
      ) : (
        header
      )}

      {isOpen && (
        <div className="px-4 pb-4">
          {storyIds.length === 0 && (
            <p className="text-sm text-neutral-400 italic">{emptyText}</p>
          )}
          {isLoading && (
            <p className="text-sm text-neutral-500">Loading stories...</p>
          )}
          {isError && (
            <div className="text-sm text-red-600">
              <p>
                Failed to load stories.{' '}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  Try again
                </button>
              </p>
            </div>
          )}
          {grouped.length > 0 && (
            <div className="space-y-4">
              {grouped.map(group => (
                <div key={group.issue?.id ?? '__none__'}>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    {group.issue?.name ?? 'No issue'}
                    <span className="ml-1.5 text-neutral-400 font-normal">({group.stories.length})</span>
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50">
                          <th scope="col" className="text-left px-3 py-1.5 font-medium text-neutral-500">Title</th>
                          <th scope="col" className="hidden md:table-cell text-left px-3 py-1.5 font-medium text-neutral-500">Rating</th>
                          <th scope="col" className="hidden lg:table-cell text-left px-3 py-1.5 font-medium text-neutral-500">Emotion</th>
                          <th scope="col" className="hidden lg:table-cell text-left px-3 py-1.5 font-medium text-neutral-500">Crawled</th>
                          {actions && actions.length > 0 && (
                            <th scope="col" className="px-1 py-1.5" style={{ width: `${actions.length * 28 + 4}px` }} />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.stories.map(story => (
                          <tr key={story.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 group">
                            <td className="px-3 py-2">
                              <Link
                                to={`/admin/stories/${story.id}`}
                                className="font-medium text-neutral-900 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                              >
                                {story.title || story.sourceTitle}
                              </Link>
                              {/* Mobile metadata */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
                                <span className="text-neutral-500 text-xs">{ratingDisplay(story)}</span>
                                {story.emotionTag && (
                                  <Badge variant={EMOTION_VARIANTS[story.emotionTag]}>{story.emotionTag}</Badge>
                                )}
                                <span className="text-neutral-400 text-xs">{formatShortDate(story.dateCrawled)}</span>
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-3 py-2 text-neutral-600">
                              {ratingDisplay(story)}
                            </td>
                            <td className="hidden lg:table-cell px-3 py-2">
                              {story.emotionTag ? (
                                <Badge variant={EMOTION_VARIANTS[story.emotionTag]}>{story.emotionTag}</Badge>
                              ) : '—'}
                            </td>
                            <td className="hidden lg:table-cell px-3 py-2 text-neutral-500 whitespace-nowrap">
                              {formatShortDate(story.dateCrawled)}
                            </td>
                            {actions && actions.length > 0 && (
                              <td className="px-1 py-2">
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  {actions.map(action => {
                                    const Icon = ACTION_ICONS[action.icon]
                                    return (
                                      <button
                                        key={action.icon}
                                        type="button"
                                        title={action.title}
                                        className={`w-6 h-6 flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-brand-500 ${ACTION_STYLES[action.icon]}`}
                                        disabled={isActioning}
                                        onClick={() => action.onClick(story.id)}
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                      </button>
                                    )
                                  })}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
