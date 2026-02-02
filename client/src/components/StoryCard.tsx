import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'
import { getCategoryColor, hexToRgba } from '../lib/category-colors'
import { getCategoryPattern } from '../lib/category-patterns'
import { formatDate } from '../lib/format'
import { getTitleLabel, getHeadline } from '../lib/title-label'
import FeedFavicon from './FeedFavicon'

interface StoryCardProps {
  story: PublicStory
  variant?: 'featured' | 'compact' | 'horizontal' | 'equal'
}


function StoryMeta({ story, size = 'sm' }: { story: PublicStory; size?: 'sm' | 'xs' }) {
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null
  return (
    <div className={`flex flex-wrap items-center gap-x-2 text-neutral-500 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
      <span className="inline-flex items-center gap-1.5">
        <FeedFavicon feedId={story.feed.id} size={size === 'xs' ? 14 : 16} />
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-700 transition-colors"
        >
          {story.feed.displayTitle || story.feed.title}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        {dateStr && <> · {dateStr}</>}
      </span>
    </div>
  )
}

export default function StoryCard({ story, variant = 'featured' }: StoryCardProps) {
  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)
  const Pattern = getCategoryPattern(issueSlug)

  const hoverStyle = { '--card-hover-color': hexToRgba(colors.hex, 0.07) } as React.CSSProperties

  // === HORIZONTAL variant (Layout B full-width) ===
  if (variant === 'horizontal') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden ${colors.borderThick} rounded-r-lg bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.005] transition-all duration-200`}
        style={hoverStyle}
      >
        <Pattern opacity={0.15} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-stretch">
          {/* Left: title + meta */}
          <div className="p-6 md:p-8 md:flex-1">
            <Link
              to={`/stories/${story.slug}`}
              className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {getTitleLabel(story) && (
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(story)}</span>
              )}
              <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
                {getHeadline(story)}
              </h3>
            </Link>
            <StoryMeta story={story} />
          </div>

          {/* Right: relevance summary or plain summary */}
          {(story.relevanceSummary || story.summary) && (
            <div className="px-6 pb-6 md:p-8 md:flex-1 md:border-l md:border-neutral-200/50 flex items-center">
              <p className="text-neutral-600 leading-relaxed">{story.relevanceSummary || story.summary}</p>
            </div>
          )}
        </div>
      </article>
    )
  }

  // === FEATURED variant ===
  if (variant === 'featured') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden rounded-lg border border-neutral-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.005] transition-all duration-200`}
        style={hoverStyle}
      >
        <div className={`rounded-t-lg ${colors.dotBg}`} style={{ height: '4px' }} aria-hidden="true" />
        <Pattern opacity={0.12} />
        <div className="relative z-10 p-6 md:p-8">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {getTitleLabel(story) && (
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(story)}</span>
            )}
            <h3 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-tight">
              {getHeadline(story)}
            </h3>
          </Link>

          <StoryMeta story={story} />

          {(story.relevanceSummary || story.summary) && (
            <p className="text-neutral-600 leading-relaxed mt-3">{story.relevanceSummary || story.summary}</p>
          )}
        </div>
      </article>
    )
  }

  // === EQUAL variant (Layout C — same-size columns) ===
  if (variant === 'equal') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden rounded-r-lg border border-neutral-200 border-l-4 ${colors.border} bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.01] transition-all duration-200 h-full`}
        style={hoverStyle}
      >
        <div className="relative z-10 p-5">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {getTitleLabel(story) && (
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(story)}</span>
            )}
            <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-snug">
              {getHeadline(story)}
            </h3>
          </Link>

          <StoryMeta story={story} size="xs" />

          {(story.relevanceSummary || story.summary) && (
            <p className="text-sm text-neutral-600 leading-relaxed mt-2">{story.relevanceSummary || story.summary}</p>
          )}
        </div>
      </article>
    )
  }

  // === COMPACT variant ===
  return (
    <article
      className={`group story-card-hover relative overflow-hidden border-l-4 ${colors.border} rounded-r-lg bg-white pl-4 pr-4 py-4 hover:shadow-md hover:shadow-brand-100/30 hover:scale-[1.005] transition-all duration-200`}
      style={hoverStyle}
    >
      <Link
        to={`/stories/${story.slug}`}
        className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        {getTitleLabel(story) && (
          <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">{getTitleLabel(story)}</span>
        )}
        <h3 className="text-base font-bold text-neutral-900 mb-1.5 group-hover:text-brand-800 transition-colors leading-snug">
          {getHeadline(story)}
        </h3>
      </Link>

      <StoryMeta story={story} size="xs" />
    </article>
  )
}
