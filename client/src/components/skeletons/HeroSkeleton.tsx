/**
 * Skeleton placeholder for the HomePage hero section.
 * Matches dimensions of the real HeroSection to prevent CLS.
 */
export default function HeroSkeleton() {
  return (
    <section className="hero-section">
      <div className="hero-section-inner animate-pulse">
        <h1 className="sr-only">Loading stories</h1>
        {/* Title label */}
        <div className="h-3 bg-neutral-300 rounded w-24 mb-3" />

        {/* Headline */}
        <div className="h-10 md:h-14 bg-neutral-300 rounded w-4/5 mb-2" />
        <div className="h-10 md:h-14 bg-neutral-300 rounded w-3/5 mb-5" />

        {/* Source + date */}
        <div className="h-4 bg-neutral-200 rounded w-48 mb-6" />

        {/* Summary text */}
        <div className="max-w-2xl space-y-3">
          <div className="h-5 bg-neutral-200 rounded w-full" />
          <div className="h-5 bg-neutral-200 rounded w-5/6" />
        </div>
      </div>
    </section>
  )
}
