import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'
import { formatDate } from '../lib/format'

interface StoryCardProps {
  story: PublicStory
  variant?: 'featured' | 'compact' | 'horizontal' | 'equal'
  rank?: number
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="rank-badge" aria-label={`Story #${rank}`}>
      {rank}
    </span>
  )
}

function StoryMeta({ story, size = 'sm' }: { story: PublicStory; size?: 'sm' | 'xs' }) {
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null
  return (
    <div className={`text-neutral-500 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
      <a
        href={story.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-neutral-700 transition-colors"
      >
        {story.feed.title}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
      {dateStr && <> · {dateStr}</>}
    </div>
  )
}

export default function StoryCard({ story, variant = 'featured', rank }: StoryCardProps) {
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)

  // === HORIZONTAL variant (Layout B full-width) ===
  if (variant === 'horizontal') {
    return (
      <article className={`group ${colors.borderThick} rounded-r-lg bg-white hover:shadow-lg hover:shadow-brand-100/50 transition-all duration-200`}>
        <div className="flex flex-col md:flex-row md:items-stretch">
          {/* Left: title + meta */}
          <div className="p-6 md:p-8 md:flex-1">
            {rank && (
              <div className="mb-3">
                <RankBadge rank={rank} />
              </div>
            )}
            <Link
              to={`/stories/${story.slug}`}
              className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
                {story.title || story.sourceTitle}
              </h3>
            </Link>
            <StoryMeta story={story} />
          </div>

          {/* Right: quote or summary */}
          {(story.quote || story.summary) && (
            <div className="px-6 pb-6 md:p-8 md:flex-1 md:border-l md:border-neutral-100 flex items-center">
              {story.quote ? (
                <div className="decorative-quote">
                  <p className="text-lg italic text-neutral-700 leading-relaxed">
                    "{story.quote}"
                  </p>
                </div>
              ) : (
                <p className="text-neutral-600 leading-relaxed line-clamp-3">{story.summary}</p>
              )}
            </div>
          )}
        </div>
      </article>
    )
  }

  // === FEATURED variant ===
  if (variant === 'featured') {
    return (
      <article className="group rounded-lg border border-neutral-200 hover:shadow-lg hover:shadow-brand-100/50 transition-all duration-200">
        <div className={`h-1 rounded-t-lg ${colors.dotBg}`} aria-hidden="true" />
        <div className="p-6 md:p-8">
          {rank && (
            <div className="mb-3">
              <RankBadge rank={rank} />
            </div>
          )}
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
              {story.title || story.sourceTitle}
            </h3>
          </Link>

          <StoryMeta story={story} />

          {story.quote && (
            <div className="decorative-quote mt-4">
              <p className="text-lg italic text-neutral-700 leading-relaxed">
                "{story.quote}"
              </p>
            </div>
          )}

          {!story.quote && story.summary && (
            <p className="text-neutral-600 leading-relaxed line-clamp-3 mt-3">{story.summary}</p>
          )}
        </div>
      </article>
    )
  }

  // === EQUAL variant (Layout C — same-size columns) ===
  if (variant === 'equal') {
    return (
      <article className="group rounded-lg border border-neutral-200 hover:shadow-lg hover:shadow-brand-100/50 transition-all duration-200 h-full">
        <div className={`h-1 rounded-t-lg ${colors.dotBg}`} aria-hidden="true" />
        <div className="p-5">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-snug">
              {story.title || story.sourceTitle}
            </h3>
          </Link>

          <StoryMeta story={story} size="xs" />

          {story.quote && (
            <p className="text-sm italic text-neutral-600 leading-relaxed mt-3 line-clamp-3">
              "{story.quote}"
            </p>
          )}

          {!story.quote && story.summary && (
            <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mt-2">{story.summary}</p>
          )}
        </div>
      </article>
    )
  }

  // === COMPACT variant ===
  return (
    <article className={`group border-l-4 ${colors.border} rounded-r-lg bg-white pl-4 pr-4 py-4 hover:shadow-md hover:shadow-brand-100/30 transition-all duration-200`}>
      <Link
        to={`/stories/${story.slug}`}
        className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        <h3 className="text-base font-bold text-neutral-900 mb-1.5 group-hover:text-brand-800 transition-colors leading-snug">
          {story.title || story.sourceTitle}
        </h3>
      </Link>

      <StoryMeta story={story} size="xs" />
    </article>
  )
}
