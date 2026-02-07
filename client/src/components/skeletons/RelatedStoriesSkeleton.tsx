import StoryCardSkeleton from './StoryCardSkeleton'

export default function RelatedStoriesSkeleton() {
  return (
    <section className="mt-10 pt-8 border-t border-neutral-200">
      <div className="h-7 bg-neutral-200 rounded w-44 mb-4 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <StoryCardSkeleton key={i} variant="compact" />
        ))}
      </div>
    </section>
  )
}
