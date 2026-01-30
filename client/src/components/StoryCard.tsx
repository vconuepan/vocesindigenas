import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'
import { formatDate } from '../lib/format'

interface StoryCardProps {
  story: PublicStory
  variant?: 'featured' | 'compact'
}

export default function StoryCard({ story, variant = 'featured' }: StoryCardProps) {
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)

  if (variant === 'featured') {
    return (
      <article className="group rounded-lg border border-neutral-200 hover:shadow-lg hover:shadow-brand-100/50 transition-all duration-200">
        <div className={`h-1 rounded-t-lg ${colors.dotBg}`} aria-hidden="true" />
        <div className="p-6">
          <Link
            to={`/stories/${story.slug}`}
            className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 group-hover:text-brand-800 transition-colors">
              {story.title || story.sourceTitle}
            </h3>
          </Link>

          <div className="text-sm text-neutral-500 mb-3">
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

          {story.quote && (
            <div className="pull-quote mb-4">
              <p>"{story.quote}"</p>
            </div>
          )}

          {!story.quote && story.summary && (
            <p className="text-neutral-600 leading-relaxed line-clamp-3">{story.summary}</p>
          )}
        </div>
      </article>
    )
  }

  // Compact variant
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

      <div className="text-xs text-neutral-500">
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
    </article>
  )
}
