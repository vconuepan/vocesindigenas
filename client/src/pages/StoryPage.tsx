import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { usePublicStory } from '../hooks/usePublicStories'
import { getCategoryColor, shiftHex } from '../lib/category-colors'
import { parsePoints } from '../lib/parse-points'
import { getTitleLabel, getHeadline } from '../lib/title-label'
import { markAsRead } from '../lib/reading-history'
import FeedFavicon from '../components/FeedFavicon'
import BookmarkButton from '../components/BookmarkButton'
import ShareButtons from '../components/ShareButtons'
import RelatedStories from '../components/RelatedStories'
import AlsoCoveredBy from '../components/AlsoCoveredBy'
import { StoryPageSkeleton } from '../components/skeletons'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildArticleSchema, buildBreadcrumbSchema } from '../lib/structured-data'

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
  const { t, i18n } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: story, isLoading, error } = usePublicStory(slug || '')

  // Redirect to primary story's URL if this slug was a non-primary cluster member
  useEffect(() => {
    if (story?.slug && slug && story.slug !== slug) {
      navigate(`/stories/${story.slug}`, { replace: true })
    }
  }, [story, slug, navigate])

  // Track reading history
  useEffect(() => {
    if (slug && story) markAsRead(slug)
  }, [slug, story])

  if (isLoading) {
    return <StoryPageSkeleton />
  }

  if (error || !story) {
    return (
      <div className="page-section text-center">
        <h1 className="page-title">{t('storyPage.notFound')}</h1>
        <p className="text-neutral-500 mb-6">
          {t('storyPage.notFoundDesc')}
        </p>
        <Link
          to="/"
          className="text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        >
          {t('storyPage.backToHome')}
        </Link>
      </div>
    )
  }

  const isEn = i18n.language === 'en'

  // Language-aware field selection — falls back to Spanish when EN translation not available
  const loc = {
    title: (isEn && story.titleEn) ? story.titleEn : story.title,
    titleLabel: (isEn && story.titleLabelEn) ? story.titleLabelEn : story.titleLabel,
    summary: (isEn && story.summaryEn) ? story.summaryEn : story.summary,
    quote: (isEn && story.quoteEn) ? story.quoteEn : story.quote,
    marketingBlurb: (isEn && story.marketingBlurbEn) ? story.marketingBlurbEn : story.marketingBlurb,
    relevanceSummary: (isEn && story.relevanceSummaryEn) ? story.relevanceSummaryEn : story.relevanceSummary,
  }

  // Build a localized story-like object for title-label helpers
  const localizedStory = { ...story, title: loc.title, titleLabel: loc.titleLabel }

  const titleLabel = getTitleLabel(localizedStory)
  const headline = getHeadline(localizedStory)
  const displayTitle = titleLabel ? `${titleLabel}: ${headline}` : headline
  const hasSourceDate = !!story.sourceDatePublished
  const displayDate = story.datePublished || story.dateCrawled
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'es-CL'
  const dateStr = new Date(displayDate).toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const sourceDateStr = story.sourceDatePublished
    ? new Date(story.sourceDatePublished).toLocaleDateString(dateLocale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const description = loc.summary || displayTitle
  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const issueName = story.issue?.name ?? story.feed?.issue?.name ?? 'News'
  const colors = getCategoryColor(issueSlug)

  return (
    <>
      <Helmet>
        <title>{displayTitle} - {SEO.siteName}</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta name="author" content="Impacto Indígena" />
        <meta property="og:title" content={displayTitle} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SEO.siteUrl}/stories/${story.slug}`} />
        <meta property="article:author" content="Impacto Indígena" />
        {story.datePublished && (
          <meta property="article:published_time" content={story.datePublished} />
        )}
        {CommonOgTags({ image: story.imageUrl || SEO.ogImage })}
        <script type="application/ld+json">
          {JSON.stringify(buildArticleSchema(story))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbSchema([
            { name: 'Home', url: SEO.siteUrl },
            { name: issueName, url: `${SEO.siteUrl}/issues/${issueSlug}` },
            { name: displayTitle },
          ]))}
        </script>
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

            {/* Metadata + share */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <time dateTime={displayDate}>{dateStr}</time>
              <span className="text-neutral-300">|</span>
              <span className="inline-flex items-center gap-1.5">
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
                {t('storyPage.originalArticle')}
                <span className="sr-only"> {t('storyPage.opensInNewTab')}</span>
              </a>
              <span className="text-neutral-300">|</span>
              <Link
                to="/methodology"
                className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
              >
                {t('storyPage.generatedByAI')}
              </Link>
              {story.slug && (
                <>
                  <span className="text-neutral-300">|</span>
                  <BookmarkButton slug={story.slug} size="sm" className="!pt-0.5 !pb-0.5" />
                  <span className="text-neutral-300">|</span>
                  <span className="inline-flex items-center gap-0.5">
                    <ShareButtons
                      url={`${SEO.siteUrl}/stories/${story.slug}`}
                      title={displayTitle}
                      description={loc.marketingBlurb || loc.summary || displayTitle}
                    />
                  </span>
                </>
              )}
            </div>

            {/* Also covered by — cluster sources */}
            {story.slug && <AlsoCoveredBy slug={story.slug} />}
          </div>
        </header>

        <div className="page-section !pt-0">
          {/* Hero image */}
          {story.imageUrl && (
            <div className="mb-8 -mx-4 md:mx-0 rounded-none md:rounded-xl overflow-hidden">
              <img
                src={story.imageUrl}
                alt={headline}
                className="w-full max-h-[420px] object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}

          {/* Summary */}
          {loc.summary && (
            <section className="mb-10">
              <div
                className="prose drop-cap"
                style={{ '--drop-cap-color': colors.hex } as React.CSSProperties}
              >
                <Markdown>{loc.summary}</Markdown>
              </div>
            </section>
          )}

          {/* Key quote — editorial pull-quote style */}
          {loc.quote && (
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
                  <p className="text-xl md:text-2xl text-neutral-700 leading-relaxed px-4 italic">
                    {loc.quote}
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
              title={t('storyPage.whyItMatters')}
              text={story.relevanceReasons}
              accentColor={colors.hex}
            />
          )}

          {/* Caveats */}
          {story.antifactors && (
            <AnalysisSection
              title={t('storyPage.caveats')}
              text={story.antifactors}
              accentColor={shiftHex(colors.hex, -0.25)}
            />
          )}

          {/* Related stories */}
          {story.slug && <RelatedStories slug={story.slug} />}

          {/* Find similar — below related stories */}
          <div className="text-center mt-6">
            <Link
              to={`/search?q=${encodeURIComponent(headline)}`}
              className="text-sm text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              {t('storyPage.searchSimilar')}
            </Link>
          </div>

          {/* Navigation */}
          <div className="border-t border-neutral-200 pt-6 mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <Link
              to="/"
              className="text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              {t('storyPage.backToHome')}
            </Link>
            <Link
              to={`/issues/${issueSlug}`}
              className="text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              {t('storyPage.moreIn', { issue: issueName })}
            </Link>
          </div>

        </div>
      </article>
    </>
  )
}
