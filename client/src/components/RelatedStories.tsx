import { useRelatedStories } from '../hooks/usePublicStories'
import StoryCard from './StoryCard'
import { RelatedStoriesSkeleton } from './skeletons'

interface RelatedStoriesProps {
  slug: string
}

export default function RelatedStories({ slug }: RelatedStoriesProps) {
  const { data: stories, isLoading } = useRelatedStories(slug)

  if (isLoading) return <RelatedStoriesSkeleton />
  if (!stories?.length) return null

  return (
    <section className="mt-10 pt-8 border-t border-neutral-200">
      <h2 className="section-heading mb-4">Related Stories</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} variant="compact" />
        ))}
      </div>
    </section>
  )
}
