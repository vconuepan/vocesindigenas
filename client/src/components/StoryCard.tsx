import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'

interface StoryCardProps {
  story: PublicStory
  variant?: 'featured' | 'compact'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export default function StoryCard({ story, variant = 'featured' }: StoryCardProps) {
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null

  return (
    <article className="border border-neutral-200 rounded-lg p-5 hover:border-brand-300 transition-colors">
      <Link
        to={`/stories/${story.id}`}
        className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        <h3 className="text-lg font-bold text-neutral-900 mb-1">
          {story.title || story.sourceTitle}
        </h3>
      </Link>

      <div className="text-sm text-neutral-400">
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-600 transition-colors"
        >
          {story.feed.title}
        </a>
        {dateStr && <>, {dateStr}</>}
      </div>

      {variant === 'featured' && story.summary && (
        <p className="text-neutral-600 text-sm mt-3">{story.summary}</p>
      )}
    </article>
  )
}
