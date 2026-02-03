import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Markdown from 'react-markdown'
import { usePublicStory } from '../hooks/usePublicStories'
import { getCategoryColor, shiftHex } from '../lib/category-colors'
import { parsePoints } from '../lib/parse-points'
import { getTitleLabel, getHeadline } from '../lib/title-label'
import FeedFavicon from '../components/FeedFavicon'
import { StoryPageSkeleton } from '../components/skeletons'
import { SEO, CommonOgTags } from '../lib/seo'

// ---------------------------------------------------------------------------
// Analysis section with ruled heading + numbered points
// ---------------------------------------------------------------------------

function AnalysisSection({
  title,
  text,
  accentColor,
}: {
  title: string
  text: string
  accentColor: string
}) {
  const points = parsePoints(text)

  return (
    <section className="mb-10">
      {/* Ruled heading with colored dot — larger text */}
      <div className="ruled-heading mb-6 !text-sm !tracking-wider">
        <span className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          {title}
        </span>
      </div>

      {/* Numbered points — fixed-width number column for alignment */}
      <div className="space-y-6">
        {points.map((point, idx) => (
          <div key={idx} className="flex gap-4">
            <span
              className="font-nexa text-2xl font-bold leading-none pt-1 select-none text-right"
              style={{ color: accentColor, opacity: 0.25, width: '2ch' }}
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            <div className="prose flex-1 min-w-0">
              <Markdown>{point}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Story page
// ---------------------------------------------------------------------------

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: story, isLoading, error } = usePublicStory(slug || '')

  if (isLoading) {
    return <StoryPageSkeleton />
  }

  if (error || !story) {
    return (
      <div className="page-section text-center">
        <h1 className="page-title">Story Not Found</h1>
        <p className="text-neutral-500 mb-6">
          This story may have been removed or is not yet published.
        </p>
        <Link
          to="/"
          className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        >
          &larr; Back to home
        </Link>
      </div>
    )
  }

  const titleLabel = getTitleLabel(story)
  const headline = getHeadline(story)
  const displayTitle = titleLabel ? `${titleLabel}: ${headline}` : headline
  const hasSourceDate = !!story.sourceDatePublished
  const displayDate = story.datePublished || story.dateCrawled
  const dateStr = new Date(displayDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const sourceDateStr = story.sourceDatePublished
    ? new Date(story.sourceDatePublished).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const description = story.summary || displayTitle
  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const issueName = story.issue?.name ?? story.feed?.issue?.name ?? 'News'
  const colors = getCategoryColor(issueSlug)

  return (
    <>
      <Helmet>
        <title>{displayTitle} - {SEO.siteName}</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta property="og:title" content={displayTitle} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SEO.siteUrl}/stories/${story.slug}`} />
        {story.datePublished && (
          <meta property="article:published_time" content={story.datePublished} />
        )}
        {CommonOgTags({})}
      </Helmet>

      <article>
        {/* Article header with category accent */}
        <header className="border-b border-neutral-100 pb-8 mb-8">
          <div className="page-section !pb-0 !mb-0">
            {/* Category label */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`category-dot ${colors.dotBg}`} aria-hidden="true" />
              <Link
                to={`/issues/${issueSlug}`}
                className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
              >
                {issueName}
              </Link>
            </div>

            {/* Title */}
            {titleLabel && (
              <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">{titleLabel}</span>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              {headline}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <time dateTime={displayDate}>{dateStr}</time>
              <span className="text-neutral-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                Based on{' '}
                <FeedFavicon feedId={story.feed.id} />
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                >
                  {story.feed.displayTitle || story.feed.title}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
                {hasSourceDate && <>, {sourceDateStr}</>}
              </span>
              <span className="text-neutral-300">|</span>
              <a
                href={story.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
              >
                Read original article
                <span className="sr-only"> (opens in new tab)</span>
              </a>
              <span className="text-neutral-300">|</span>
              <Link
                to="/methodology"
                className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
              >
                AI-generated
              </Link>
            </div>
          </div>
        </header>

        <div className="page-section !pt-0">
          {/* Summary */}
          {story.summary && (
            <section className="mb-10">
              <div
                className="prose drop-cap"
                style={{ '--drop-cap-color': colors.hex } as React.CSSProperties}
              >
                <Markdown>{story.summary}</Markdown>
              </div>
            </section>
          )}

          {/* Key quote — editorial pull-quote style */}
          {story.quote && (
            <div className="py-6 md:py-8 text-center max-w-2xl mx-auto mb-10">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="block text-brand-200 leading-none select-none pointer-events-none"
                  style={{ fontSize: '6rem', fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  &ldquo;
                </span>
                <blockquote className="-mt-8">
                  {/* No italic — avoids loading Roboto-Italic; decorative quotes provide visual distinction */}
                  <p className="text-xl md:text-2xl text-neutral-700 leading-relaxed px-4">
                    {story.quote}
                  </p>
                </blockquote>
                {story.quoteAttribution && (
                  <p className="text-sm text-neutral-500 mt-3">&mdash; {story.quoteAttribution}</p>
                )}
              </div>
            </div>
          )}

          {/* Why This Matters */}
          {story.relevanceReasons && (
            <AnalysisSection
              title="Why This Matters"
              text={story.relevanceReasons}
              accentColor={colors.hex}
            />
          )}

          {/* Caveats */}
          {story.antifactors && (
            <AnalysisSection
              title="Caveats"
              text={story.antifactors}
              accentColor={shiftHex(colors.hex, -0.25)}
            />
          )}

          {/* Back / category navigation */}
          <div className="border-t border-neutral-200 pt-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <Link
              to="/"
              className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              &larr; Back to all stories
            </Link>
            <Link
              to={`/issues/${issueSlug}`}
              className="self-end sm:self-auto text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              More in {issueName} &rarr;
            </Link>
          </div>

        </div>
      </article>
    </>
  )
}
