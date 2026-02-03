import StoryCardSkeleton from './StoryCardSkeleton'

/**
 * Skeleton placeholder for IssuePage.
 * Matches the issue page layout to prevent CLS.
 */
export default function IssuePageSkeleton() {
  return (
    <div className="page-section-wide animate-pulse">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-200" />
            <div className="h-7 bg-neutral-200 rounded w-48" />
          </div>
          <div className="w-8 h-8 bg-neutral-100 rounded" />
        </div>
      </header>

      {/* Sub-topics pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="h-8 bg-neutral-100 rounded-full w-24" />
        <div className="h-8 bg-neutral-100 rounded-full w-32" />
        <div className="h-8 bg-neutral-100 rounded-full w-28" />
      </div>

      {/* Stories grid - Layout A style */}
      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <div className="md:col-span-2">
          <StoryCardSkeleton variant="featured" />
        </div>
        <div className="space-y-3">
          <StoryCardSkeleton variant="compact" />
          <StoryCardSkeleton variant="compact" />
          <StoryCardSkeleton variant="compact" />
        </div>
      </div>
    </div>
  )
}
