import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useHomepageData } from '../hooks/useHomepageData'
import StoryCard from '../components/StoryCard'
import PullQuote, { getQuoteVariant } from '../components/PullQuote'
import { HeroSkeleton, IssueSectionSkeleton } from '../components/skeletons'
import type { PublicIssue } from '../lib/api'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'
import { getCategoryPattern } from '../lib/category-patterns'
import { parsePoints, stripMarkdown, stripPrefix, limitSentences } from '../lib/parse-points'
import { formatDate } from '../lib/format'
import { getTitleLabel, getHeadline } from '../lib/title-label'
import { SEO, CommonOgTags } from '../lib/seo'
import { buildWebSiteSchema, buildOrganizationSchema } from '../lib/structured-data'
import SupportBanner from '../components/SupportBanner'
import { usePositivity } from '../contexts/PositivityContext'
import { mixHomepageStories, pickHero } from '../lib/mix-stories'

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroSection({ story }: { story: PublicStory }) {
  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const Pattern = getCategoryPattern(issueSlug)
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null
  const heroImage = story.imageUrl || null
  const fallbackImage = 'https://impactoindigena.news/images/og-image.png'

  return (
    <section className="hero-section">
      {Pattern && <Pattern opacity={0.2} />}
      <div className="hero-section-inner">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Imagen del hero */}
          <div className="w-full md:w-2/5 flex-shrink-0">
            <Link to={`/stories/${story.slug}`}>
              <img
                src={heroImage || fallbackImage}
                alt={story.title || story.sourceTitle || ''}
                className="w-full h-48 md:h-64 object-cover rounded-lg shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = fallbackImage
                }}
              />
            </Link>
          </div>
          {/* Contenido del hero */}
          <div className="flex-1">
            {getTitleLabel(story) && (
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{getTitleLabel(story)}</span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold font-nexa text-neutral-900 mb-4 leading-tight">
              <Link
                to={`/stories/${story.slug}`}
                className="hover:text-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                {getHeadline(story)}
              </Link>
            </h1>
            <div className="text-sm text-neutral-500 mb-6">
  
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
             className="text-neutral-600 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
             >
            {story.feed.displayTitle || story.feed.title}
            <span className="sr-only"> (opens in new tab)</span>
            </a>
            {dateStr && <> · {dateStr}</>}
            </div>
            {story.relevanceReasons && parsePoints(story.relevanceReasons)[0] ? (
              <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
                {limitSentences(stripPrefix(stripMarkdown(parsePoints(story.relevanceReasons)[0])), 2)}
              </p>
            ) : story.quote ? (
              <blockquote className="decorative-quote max-w-2xl">
                <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
                  &ldquo;{story.quote}&rdquo;
                </p>
                {story.quoteAttribution && (
                  <p className="text-xs text-neutral-500 mt-1">&mdash; {story.quoteAttribution}</p>
                )}
              </blockquote>
            ) : story.summary ? (
              <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
                {story.summary}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section heading with rules
// ---------------------------------------------------------------------------

function RuledHeading({ issue }: { issue: PublicIssue }) {
  const colors = getCategoryColor(issue.slug)

  return (
    <div className="relative z-20 mb-5">
      <div className="flex items-center justify-center gap-4 text-neutral-600">
        <span className="hidden md:block flex-1 border-t border-neutral-200" aria-hidden="true" />
        <Link
          to={`/issues/${issue.slug}`}
          className="flex items-center gap-2 hover:text-neutral-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dotBg} shrink-0`} aria-hidden="true" />
          <h2 className="text-lg font-bold uppercase tracking-wider md:text-xl">{issue.name}</h2>
        </Link>
        <span className="hidden md:block flex-1 border-t border-neutral-200" aria-hidden="true" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Issue section with rotating layouts
// ---------------------------------------------------------------------------

type LayoutVariant = 'A' | 'B' | 'C'

function IssueSection({
  issue,
  allStories,
  heroStoryId,
  layout,
  divider,
  quoteVariantIndex,
}: {
  issue: PublicIssue
  allStories: PublicStory[]
  heroStoryId: string | null
  layout: LayoutVariant
  divider?: 'quote' | 'diamond' | 'none'
  quoteVariantIndex?: number
}) {
  // Exclude the hero story from this section
  const stories = heroStoryId
    ? allStories.filter((s) => s.id !== heroStoryId)
    : allStories

  if (stories.length === 0) return null

  const [featured, ...rest] = stories

  return (
    <>
      <section className="relative mb-6 mt-14 md:mt-28">
        {/* Pre-rendered PNG to avoid Chromium inline-SVG compositing bug */}
        <div className="absolute -left-12 top-0 -translate-y-[40%] z-10 pointer-events-none select-none hidden md:block w-[200px] h-[200px]">
          <img src={`/illustrations/${issue.slug}.png`} alt="" className="opacity-[0.18] w-full h-full" />
        </div>

        <RuledHeading issue={issue} />

        <div className="relative">
          {/* Layout A: 2+3 grid (featured left, compacts right) */}
          {layout === 'A' && (
            <div className="grid gap-5 md:grid-cols-3">
              <div className="md:col-span-2">
                <StoryCard story={featured} variant="featured" />
              </div>
              {rest.length > 0 && (
                <div className="space-y-3">
                  {rest.slice(0, 3).map((story) => (
                    <StoryCard key={story.id} story={story} variant="compact" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Layout B: Full-width horizontal card + compact row below */}
          {layout === 'B' && (
            <div className="space-y-5">
              <StoryCard story={featured} variant="horizontal" />
              {rest.length > 0 && (
                <div className="grid gap-5 md:grid-cols-3">
                  {rest.slice(0, 3).map((story) => (
                    <StoryCard key={story.id} story={story} variant="compact" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Layout C: Three equal columns + compact remainder */}
          {layout === 'C' && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-3">
                {stories.slice(0, 3).map((story) => (
                  <StoryCard key={story.id} story={story} variant="equal" />
                ))}
              </div>
              {stories.length > 3 && (
                <div className="grid gap-5 md:grid-cols-3">
                  {stories.slice(3, 6).map((story) => (
                    <StoryCard key={story.id} story={story} variant="compact" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section divider */}
      {divider === 'quote' && (
        <QuoteDivider stories={allStories} variantIndex={quoteVariantIndex ?? 0} />
      )}
      {divider === 'diamond' && <hr className="section-divider" />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Quote divider using the new PullQuote component
// ---------------------------------------------------------------------------

function QuoteDivider({ stories, variantIndex }: { stories: PublicStory[]; variantIndex: number }) {
  const storyWithQuote = stories.find((s) => s.quote)
  if (!storyWithQuote) return null

  return <PullQuote story={storyWithQuote} variant={getQuoteVariant(variantIndex)} />
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

const ISSUE_ORDER = [
  'cambio-climatico',
  'derechos-indigenas',
  'desarrollo-sostenible-y-autodeterminado',
  'reconciliacion-y-paz',
]

const LAYOUTS: LayoutVariant[] = ['A', 'B', 'C']

export default function HomePage() {
  const { positivity } = usePositivity()
  // Single API call — both emotion buckets per issue, mixed client-side
  const { data, isLoading } = useHomepageData()

  const issues = data?.issues ?? []
  const storiesByIssueBuckets = data?.storiesByIssue ?? {}

  // Pick hero client-side from the issue buckets based on positivity
  const heroStory = pickHero(storiesByIssueBuckets, positivity)

  const sortedIssues = [...issues]
    .filter((i) => ISSUE_ORDER.includes(i.slug))
    .sort((a, b) => ISSUE_ORDER.indexOf(a.slug) - ISSUE_ORDER.indexOf(b.slug))

  let quoteIdx = 0

  return (
    <>
      <Helmet>
        <title>{SEO.defaultTitle}</title>
        <meta name="description" content={SEO.defaultDescription} />
        <meta property="og:title" content={SEO.defaultTitle} />
        <meta property="og:description" content={SEO.defaultDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/`} />
        {CommonOgTags({})}
        <script type="application/ld+json">
          {JSON.stringify(buildWebSiteSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildOrganizationSchema())}
        </script>
      </Helmet>

      {/* Hero — show skeleton while loading */}
      {isLoading ? <HeroSkeleton /> : heroStory ? <HeroSection story={heroStory} /> : null}

      {/* Issue sections with rotating layouts */}
      <div className="page-section-wide md:-mt-14 min-h-screen">
        {isLoading ? (
          // Show skeleton sections while data loads
          <>
            <IssueSectionSkeleton layout="A" />
            <IssueSectionSkeleton layout="B" />
            <IssueSectionSkeleton layout="C" />
            <IssueSectionSkeleton layout="A" />
          </>
        ) : sortedIssues.length > 0 ? (
          sortedIssues.map((issue, idx) => {
            const layout = LAYOUTS[idx % LAYOUTS.length]
            const isLast = idx === sortedIssues.length - 1
            const divider: 'quote' | 'diamond' | 'none' = isLast
              ? 'none'
              : idx % 2 === 0
                ? 'quote'
                : 'none'

            const currentQuoteIdx = divider === 'quote' ? quoteIdx++ : 0

            const buckets = storiesByIssueBuckets[issue.slug]
            const mixed = buckets
              ? mixHomepageStories(buckets, 7, positivity)
              : []

            return (
              <IssueSection
                key={issue.id}
                issue={issue}
                allStories={mixed}
                heroStoryId={heroStory?.id ?? null}
                layout={layout}
                divider={divider}
                quoteVariantIndex={currentQuoteIdx}
              />
            )
          }).reduce<React.ReactNode[]>((acc, section, idx) => {
            acc.push(section)
            // Insert support banner after the 2nd issue section
            if (idx === 1) {
              acc.push(
                <SupportBanner key="support-banner" />
              )
            }
            return acc
          }, [])
        ) : (
          <p className="text-center text-neutral-500 py-12">
            No stories published yet. Check back soon.
          </p>
        )}
      </div>
    </>
  )
}
