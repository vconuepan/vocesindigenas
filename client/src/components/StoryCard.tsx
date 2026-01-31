import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'
import { getCategoryColor, hexToRgba } from '../lib/category-colors'
import { getCategoryPattern } from '../lib/category-patterns'
import { formatDate } from '../lib/format'
import UpliftingBadge from './UpliftingBadge'

interface StoryCardProps {
  story: PublicStory
  variant?: 'featured' | 'compact' | 'horizontal' | 'equal'
}

function StoryMeta({ story, size = 'sm', issueColor }: { story: PublicStory; size?: 'sm' | 'xs'; issueColor?: string }) {
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null
  return (
    <div className={`flex flex-wrap items-center gap-x-2 text-neutral-500 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
      <span>
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
      </span>
      {/* Mobile: inline pill badge */}
      {story.emotionTag === 'uplifting' && (
        <span className="md:hidden">
          <UpliftingBadge size={size} color={issueColor} />
        </span>
      )}
    </div>
  )
}

/**
 * Corner ribbon for uplifting stories on desktop.
 * Shows a small triangular fold in the top-right corner with a sun icon.
 * Color matches the issue category.
 */
function UpliftingRibbon({ color }: { color: string }) {
  return (
    <div
      className="hidden md:block absolute top-0 right-0 z-20 overflow-hidden w-7 h-7"
      title="Uplifting story"
      role="img"
      aria-label="Uplifting story"
    >
      {/* Triangle background */}
      <div className="absolute top-0 right-0 w-0 h-0" style={{
        borderTop: `28px solid ${color}`,
        borderLeft: '28px solid transparent',
      }} />
      {/* Sun icon */}
      <svg
        className="absolute top-[3px] right-[3px] w-2.5 h-2.5 text-white"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="3.5" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default function StoryCard({ story, variant = 'featured' }: StoryCardProps) {
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)
  const Pattern = getCategoryPattern(issueSlug)
  const isUplifting = story.emotionTag === 'uplifting'

  const hoverStyle = { '--card-hover-color': hexToRgba(colors.hex, 0.07) } as React.CSSProperties

  // === HORIZONTAL variant (Layout B full-width) ===
  if (variant === 'horizontal') {
    return (
      <article
        className={`group story-card-hover relative overflow-hidden ${colors.borderThick} rounded-r-lg bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.005] transition-all duration-200`}
        style={hoverStyle}
      >
        <Pattern opacity={0.15} />
        {isUplifting && <UpliftingRibbon color={colors.hex} />}
        <div className="relative z-10 flex flex-col md:flex-row md:items-stretch">
          {/* Left: title + meta */}
          <div className="p-6 md:p-8 md:flex-1">
            <Link
              to={`/stories/${story.slug}`}
              className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
                {story.title || story.sourceTitle}
              </h3>
            </Link>
            <StoryMeta story={story} issueColor={colors.hex} />
          </div>

          {/* Right: quote or summary */}
          {(story.quote || story.summary) && (
            <div className="px-6 pb-6 md:p-8 md:flex-1 md:border-l md:border-neutral-200/50 flex items-center">
              {story.quote ? (
                <div className="decorative-quote">
                  <p className="text-lg italic text-neutral-700 leading-relaxed">
                    &ldquo;{story.quote}&rdquo;
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
      <article
        className={`group story-card-hover relative overflow-hidden rounded-lg border border-neutral-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.005] transition-all duration-200`}
        style={hoverStyle}
      >
        <div className={`rounded-t-lg ${colors.dotBg}`} style={{ height: '4px' }} aria-hidden="true" />
        <Pattern opacity={0.12} />
        {isUplifting && <UpliftingRibbon color={colors.hex} />}
        <div className="relative z-10 p-6 md:p-8">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-tight">
              {story.title || story.sourceTitle}
            </h3>
          </Link>

          <StoryMeta story={story} issueColor={colors.hex} />

          {story.quote && (
            <div className="decorative-quote mt-4">
              <p className="text-lg italic text-neutral-700 leading-relaxed">
                &ldquo;{story.quote}&rdquo;
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
      <article
        className={`group story-card-hover relative overflow-hidden rounded-r-lg border border-neutral-200 border-l-4 ${colors.border} bg-white hover:shadow-xl hover:shadow-brand-100/50 hover:scale-[1.01] transition-all duration-200 h-full`}
        style={hoverStyle}
      >
        {isUplifting && <UpliftingRibbon color={colors.hex} />}
        <div className="relative z-10 p-5">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors leading-snug">
              {story.title || story.sourceTitle}
            </h3>
          </Link>

          <StoryMeta story={story} size="xs" issueColor={colors.hex} />

          {story.quote && (
            <p className="text-sm italic text-neutral-600 leading-relaxed mt-3 line-clamp-3">
              &ldquo;{story.quote}&rdquo;
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
    <article
      className={`group story-card-hover relative overflow-hidden border-l-4 ${colors.border} rounded-r-lg bg-white pl-4 pr-4 py-4 hover:shadow-md hover:shadow-brand-100/30 hover:scale-[1.005] transition-all duration-200`}
      style={hoverStyle}
    >
      {isUplifting && <UpliftingRibbon color={colors.hex} />}
      <Link
        to={`/stories/${story.slug}`}
        className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        <h3 className="text-base font-bold text-neutral-900 mb-1.5 group-hover:text-brand-800 transition-colors leading-snug">
          {story.title || story.sourceTitle}
        </h3>
      </Link>

      <StoryMeta story={story} size="xs" issueColor={colors.hex} />
    </article>
  )
}
