import StoryCardSkeleton from './StoryCardSkeleton'

/**
 * Skeleton placeholder for SearchPage results grid.
 * Shows 6 card placeholders in a 3-column grid.
 */
export default function SearchResultsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <StoryCardSkeleton key={i} variant="equal" />
      ))}
    </div>
  )
}
