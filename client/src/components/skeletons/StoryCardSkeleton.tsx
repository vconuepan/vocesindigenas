/**
 * Skeleton placeholder for StoryCard component.
 * Matches dimensions of the real component to prevent CLS.
 */

interface StoryCardSkeletonProps {
  variant?: 'featured' | 'compact' | 'horizontal' | 'equal'
}

export default function StoryCardSkeleton({ variant = 'featured' }: StoryCardSkeletonProps) {
  // === HORIZONTAL variant ===
  if (variant === 'horizontal') {
    return (
      <div className="animate-pulse rounded-r-lg border-l-4 border-neutral-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="p-6 md:p-8 md:flex-1">
            <div className="h-3 bg-neutral-200 rounded w-24 mb-2" />
            <div className="h-8 bg-neutral-200 rounded w-4/5 mb-2" />
            <div className="h-6 bg-neutral-200 rounded w-3/5 mb-3" />
            <div className="h-4 bg-neutral-100 rounded w-40" />
          </div>
          <div className="px-6 pb-6 md:p-8 md:flex-1 md:border-l md:border-neutral-200/50 flex items-center">
            <div className="space-y-2 w-full">
              <div className="h-4 bg-neutral-100 rounded w-full" />
              <div className="h-4 bg-neutral-100 rounded w-5/6" />
              <div className="h-4 bg-neutral-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === FEATURED variant ===
  if (variant === 'featured') {
    return (
      <div className="animate-pulse rounded-lg border border-neutral-200 bg-white">
        <div className="rounded-t-lg bg-neutral-200" style={{ height: '4px' }} />
        <div className="p-6 md:p-8">
          <div className="h-3 bg-neutral-200 rounded w-24 mb-2" />
          <div className="h-10 bg-neutral-200 rounded w-4/5 mb-2" />
          <div className="h-8 bg-neutral-200 rounded w-3/5 mb-3" />
          <div className="h-4 bg-neutral-100 rounded w-40 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-neutral-100 rounded w-full" />
            <div className="h-4 bg-neutral-100 rounded w-4/5" />
          </div>
        </div>
      </div>
    )
  }

  // === EQUAL variant ===
  if (variant === 'equal') {
    return (
      <div className="animate-pulse rounded-r-lg border border-neutral-200 border-l-4 bg-white h-full">
        <div className="p-5">
          <div className="h-3 bg-neutral-200 rounded w-20 mb-2" />
          <div className="h-5 bg-neutral-200 rounded w-4/5 mb-1" />
          <div className="h-5 bg-neutral-200 rounded w-3/5 mb-3" />
          <div className="h-3 bg-neutral-100 rounded w-32 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-4/5" />
          </div>
        </div>
      </div>
    )
  }

  // === COMPACT variant (default) ===
  return (
    <div className="animate-pulse border-l-4 border-neutral-200 rounded-r-lg bg-white pl-4 pr-4 py-4">
      <div className="h-3 bg-neutral-200 rounded w-20 mb-1" />
      <div className="h-5 bg-neutral-200 rounded w-4/5 mb-1" />
      <div className="h-4 bg-neutral-200 rounded w-3/5 mb-2" />
      <div className="h-3 bg-neutral-100 rounded w-32" />
    </div>
  )
}
