import StoryCardSkeleton from './StoryCardSkeleton'

/**
 * Skeleton placeholder for an IssueSection on the HomePage.
 * Matches dimensions based on layout variant to prevent CLS.
 */

type LayoutVariant = 'A' | 'B' | 'C'

interface IssueSectionSkeletonProps {
  layout: LayoutVariant
}

export default function IssueSectionSkeleton({ layout }: IssueSectionSkeletonProps) {
  return (
    <section className="relative mb-6 mt-14 md:mt-28">
      {/* Skeleton heading */}
      <div className="relative z-20 mb-5">
        <div className="flex items-center justify-center gap-4 animate-pulse">
          <span className="hidden md:block flex-1 border-t border-neutral-200" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
            <div className="h-6 bg-neutral-200 rounded w-40" />
          </div>
          <span className="hidden md:block flex-1 border-t border-neutral-200" />
        </div>
      </div>

      {/* Layout A: 2+3 grid */}
      {layout === 'A' && (
        <div className="grid gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <StoryCardSkeleton variant="featured" />
          </div>
          <div className="space-y-3">
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
          </div>
        </div>
      )}

      {/* Layout B: horizontal + compact row */}
      {layout === 'B' && (
        <div className="space-y-5">
          <StoryCardSkeleton variant="horizontal" />
          <div className="grid gap-5 md:grid-cols-3">
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
          </div>
        </div>
      )}

      {/* Layout C: three equal columns + compact row */}
      {layout === 'C' && (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <StoryCardSkeleton variant="equal" />
            <StoryCardSkeleton variant="equal" />
            <StoryCardSkeleton variant="equal" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
            <StoryCardSkeleton variant="compact" />
          </div>
        </div>
      )}
    </section>
  )
}
