import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/admin-api'

interface AssignedStoriesListProps {
  storyIds: string[]
}

export function AssignedStoriesList({ storyIds }: AssignedStoriesListProps) {
  const [expanded, setExpanded] = useState(false)
  const idsKey = useMemo(() => [...storyIds].sort().join(','), [storyIds])

  const { data: stories, isLoading, isError, refetch } = useQuery({
    queryKey: ['stories', 'batch', idsKey],
    queryFn: () => adminApi.stories.batch(storyIds),
    enabled: expanded && storyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-neutral-900">
          Assigned stories: {storyIds.length}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {storyIds.length === 0 && (
            <p className="text-sm text-neutral-400 italic">No stories assigned yet.</p>
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
          {stories && stories.length > 0 && (
            <ul className="space-y-1">
              {stories.map(story => (
                <li key={story.id}>
                  <Link
                    to={`/admin/stories/${story.id}`}
                    className="text-sm text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {story.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
