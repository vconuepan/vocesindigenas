/**
 * Skeleton placeholder for StoryPage.
 * Matches the full story page layout to prevent CLS.
 */
export default function StoryPageSkeleton() {
  return (
    <article className="animate-pulse">
      {/* Header */}
      <header className="border-b border-neutral-100 pb-8 mb-8">
        <div className="page-section !pb-0 !mb-0">
          {/* Category */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
            <div className="h-3 bg-neutral-200 rounded w-32" />
          </div>

          {/* Title label */}
          <div className="h-3 bg-neutral-200 rounded w-24 mb-3" />

          {/* Headline */}
          <div className="h-10 md:h-12 bg-neutral-300 rounded w-4/5 mb-2" />
          <div className="h-10 md:h-12 bg-neutral-300 rounded w-3/5 mb-5" />

          {/* Metadata */}
          <div className="h-4 bg-neutral-200 rounded w-80" />
        </div>
      </header>

      <div className="page-section !pt-0">
        {/* Summary */}
        <section className="mb-10">
          <div className="space-y-3">
            <div className="h-5 bg-neutral-200 rounded w-full" />
            <div className="h-5 bg-neutral-200 rounded w-full" />
            <div className="h-5 bg-neutral-200 rounded w-4/5" />
            <div className="h-5 bg-neutral-200 rounded w-full" />
            <div className="h-5 bg-neutral-200 rounded w-3/5" />
          </div>
        </section>

        {/* Quote placeholder */}
        <div className="py-6 md:py-8 text-center max-w-2xl mx-auto mb-10">
          <div className="h-20 bg-neutral-100 rounded w-full" />
        </div>

        {/* Analysis section placeholder */}
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-neutral-200" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              <div className="h-4 bg-neutral-200 rounded w-32" />
            </div>
            <div className="flex-1 border-t border-neutral-200" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-neutral-100 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-full" />
                  <div className="h-4 bg-neutral-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  )
}
