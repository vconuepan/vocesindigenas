import { Link } from 'react-router-dom'
import type { Story } from '@shared/types'
import EmotionBadge from './EmotionBadge'
import RatingDisplay from './RatingDisplay'

interface StoryCardProps {
  story: Story
}

export default function StoryCard({ story }: StoryCardProps) {
  const dateStr = story.datePublished
    ? new Date(story.datePublished).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <article className="border border-neutral-200 rounded-lg p-5 hover:border-brand-300 transition-colors">
      <Link
        to={`/stories/${story.id}`}
        className="block focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2">
          {story.title}
        </h3>
      </Link>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {story.emotionTag && <EmotionBadge emotion={story.emotionTag} />}
        <RatingDisplay low={story.relevanceRatingLow} />
        {dateStr && (
          <span className="text-sm text-neutral-400">{dateStr}</span>
        )}
      </div>

      {story.aiSummary && (
        <p className="text-neutral-600 text-sm line-clamp-3">{story.aiSummary}</p>
      )}
    </article>
  )
}
