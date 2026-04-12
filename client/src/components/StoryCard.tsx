import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PublicStory } from '@shared/types'
import { getCategoryColor, hexToRgba } from '../lib/category-colors'
import { getCategoryPattern } from '../lib/category-patterns'
import { formatDate } from '../lib/format'
import { getTitleLabel, getHeadline } from '../lib/title-label'
import { isRead } from '../lib/reading-history'
import FeedFavicon from './FeedFavicon'
import BookmarkButton from './BookmarkButton'

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
          className="text-neutral-600 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
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
  const { i18n } = useTranslation()
  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)
  const Pattern = getCategoryPattern(issueSlug)
  const [read, setRead] = useState(false)

  useEffect(() => {
    if (story.slug) setRead(isRead(story.slug))
  }, [story.slug])

  const hoverStyle = { '--card-hover-color': hexToRgba(colors.hex, 0.07) } as React.CSSProperties
  const readClass = read ? 'opacity-70' : ''

  // Language-aware field selection
  const isEn = i18n.language === 'en'
  const localizedStory = {
    ...story,
    title: (isEn && story.titleEn) ? story.titleEn : story.title,
    titleLabel: (isEn && story.titleLabelEn) ? story.titleLabelEn : story.titleLabel,
  }
  const displaySummary: string | null | undefined = (isEn && story.relevanceSummaryEn) ? story.relevanceSummaryEn
    : (isEn && story.summaryEn) ? story.summaryEn
    : story.relevanceSummary || story.summary

  // === HORIZONTAL variant (Layout B full-width) ===
  if (variant === 'horizontal') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden ${colors.borderThick} rounded-r-lg bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-200`}
        style={hoverStyle}
      >
        {Pattern && <Pattern opacity={0.15} />}
        <div className="relative z-10 flex flex-col md:flex-row md:items-stretch">
          {/* Left: title + meta */}
          <div className="p-6 md:p-8 md:flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/stories/${story.slug}`}
                className="block flex-1 min-w-0 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                {getTitleLabel(localizedStory) && (
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(localizedStory)}</span>
                )}
                <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
                  {getHeadline(localizedStory)}
                </h3>
              </Link>
              {story.slug && <BookmarkButton slug={story.slug} size="sm" hoverReveal className="shrink-0" />}
            </div>
            <StoryMeta story={story} />
          </div>

          {/* Right: relevance summary or plain summary */}
          {(displaySummary) && (
            <div className="px-6 pb-6 md:p-8 md:flex-1 md:border-l md:border-neutral-200/50 flex items-center">
              <p className="text-neutral-600 leading-relaxed">{displaySummary}</p>
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
        className={`group story-card-hover relative overflow-hidden rounded-lg border border-neutral-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-200`}
        style={hoverStyle}
      >
        <div className={`rounded-t-lg ${colors.dotBg}`} style={{ height: '4px' }} aria-hidden="true" />
        {Pattern && <Pattern opacity={0.12} />}
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/stories/${story.slug}`}
              className="block flex-1 min-w-0 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {getTitleLabel(localizedStory) && (
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(localizedStory)}</span>
              )}
              <h3 className={`text-3xl md:text-4xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-tight ${readClass}`}>
                {getHeadline(localizedStory)}
              </h3>
            </Link>
            {story.slug && <BookmarkButton slug={story.slug} size="sm" hoverReveal className="shrink-0" />}
          </div>

          <StoryMeta story={story} />

          {(displaySummary) && (
            <p className="text-neutral-600 leading-relaxed mt-3">{displaySummary}</p>
          )}
        </div>
      </article>
    )
  }

  // === EQUAL variant (Layout C — same-size columns) ===
  if (variant === 'equal') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden rounded-r-lg border border-neutral-200 border-l-4 ${colors.border} bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-200 h-full`}
        style={hoverStyle}
      >
        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between gap-1">
            <Link
              to={`/stories/${story.slug}`}
              className="block flex-1 min-w-0 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {getTitleLabel(localizedStory) && (
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">{getTitleLabel(localizedStory)}</span>
              )}
              <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-snug">
                {getHeadline(localizedStory)}
              </h3>
            </Link>
            {story.slug && <BookmarkButton slug={story.slug} size="sm" hoverReveal className="shrink-0" />}
          </div>

          <StoryMeta story={story} size="xs" />

          {(displaySummary) && (
            <p className="text-sm text-neutral-600 leading-relaxed mt-2">{displaySummary}</p>
          )}
        </div>
      </article>
    )
  }

  // === COMPACT variant ===
  return (
    <article
      className={`group story-card-hover relative overflow-hidden border-l-4 ${colors.border} rounded-r-lg bg-white pl-4 pr-4 py-4 hover:shadow-md hover:shadow-brand-100/30 transition-all duration-200`}
      style={hoverStyle}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {getTitleLabel(localizedStory) && (
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">{getTitleLabel(localizedStory)}</span>
            )}
            <h3 className={`text-base font-bold text-neutral-900 mb-1.5 group-hover:text-brand-800 transition-colors leading-snug ${readClass}`}>
              {getHeadline(localizedStory)}
            </h3>
          </Link>
          <StoryMeta story={story} size="xs" />
        </div>
        {story.slug && (
          <BookmarkButton slug={story.slug} size="sm" hoverReveal className="shrink-0" />
        )}
      </div>
    </article>
  )
}
