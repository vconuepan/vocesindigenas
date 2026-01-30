import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { usePublicIssues } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import type { PublicIssue } from '../lib/api'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'
import { formatDate } from '../lib/format'

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroSection({ story }: { story: PublicStory }) {
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const issueName = story.feed?.issue?.name ?? 'News'
  const colors = getCategoryColor(issueSlug)
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null

  return (
    <section className="hero-section">
      <div className="hero-section-inner">
        <div className="flex items-center gap-3 mb-4">
          <span className="rank-badge" aria-label="Story #1">1</span>
          <div className="flex items-center">
            <span className={`category-dot ${colors.dotBg}`} aria-hidden="true" />
            <Link
              to={`/issues/${issueSlug}`}
              className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
            >
              {issueName}
            </Link>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold font-nexa text-neutral-900 mb-4 leading-tight">
          <Link
            to={`/stories/${story.slug}`}
            className="hover:text-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {story.title || story.sourceTitle}
          </Link>
        </h1>

        <div className="text-sm text-neutral-500 mb-6">
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-700 transition-colors"
          >
            {story.feed.title}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          {dateStr && <> · {dateStr}</>}
        </div>

        {story.quote ? (
          <blockquote className="decorative-quote max-w-2xl">
            <p className="text-lg md:text-xl italic text-neutral-700 leading-relaxed">
              "{story.quote}"
            </p>
          </blockquote>
        ) : story.summary ? (
          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
            {story.summary}
          </p>
        ) : null}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Standalone pull quote divider
// ---------------------------------------------------------------------------

function PullQuoteDivider({ stories }: { stories: PublicStory[] }) {
  const storyWithQuote = stories.find((s) => s.quote)
  if (!storyWithQuote) return null

  return (
    <div className="py-10 md:py-14 text-center max-w-2xl mx-auto">
      <div className="decorative-quote inline-block text-left">
        <blockquote>
          <p className="text-xl md:text-2xl italic text-neutral-700 leading-relaxed">
            "{storyWithQuote.quote}"
          </p>
        </blockquote>
        <footer className="mt-3 text-sm text-neutral-500">
          — from{' '}
          <Link
            to={`/stories/${storyWithQuote.slug}`}
            className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
          >
            {storyWithQuote.title || storyWithQuote.sourceTitle}
          </Link>
        </footer>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section heading with rules
// ---------------------------------------------------------------------------

function RuledHeading({ issue }: { issue: PublicIssue }) {
  const colors = getCategoryColor(issue.slug)
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="ruled-heading flex-1">
        <Link
          to={`/issues/${issue.slug}`}
          className="flex items-center gap-2 hover:text-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dotBg} shrink-0`} aria-hidden="true" />
          {issue.name}
        </Link>
      </div>
      <Link
        to={`/issues/${issue.slug}`}
        className="text-sm text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 ml-4 shrink-0"
      >
        View all &rarr;
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Issue section with rotating layouts
// ---------------------------------------------------------------------------

type LayoutVariant = 'A' | 'B' | 'C'

function IssueSection({
  issue,
  heroStoryId,
  layout,
  rank,
  divider,
}: {
  issue: PublicIssue
  heroStoryId: string | null
  layout: LayoutVariant
  rank?: number
  divider?: 'quote' | 'diamond' | 'none'
}) {
  const { data } = usePublicStories({ issueSlug: issue.slug, pageSize: 5 })
  const allStories = data?.data ?? []

  // Exclude the hero story from this section
  const stories = heroStoryId
    ? allStories.filter((s) => s.id !== heroStoryId)
    : allStories

  if (stories.length === 0) return null

  const [featured, ...rest] = stories

  return (
    <>
      <section className="mb-8">
        <RuledHeading issue={issue} />

        {/* Layout A: 2+3 grid (featured left, compacts right) */}
        {layout === 'A' && (
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <StoryCard story={featured} variant="featured" rank={rank} />
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
            <StoryCard story={featured} variant="horizontal" rank={rank} />
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
                {stories.slice(3).map((story) => (
                  <StoryCard key={story.id} story={story} variant="compact" />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section divider */}
      {divider === 'quote' && <PullQuoteDivider stories={allStories} />}
      {divider === 'diamond' && <hr className="section-divider" />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

const ISSUE_ORDER = [
  'human-development',
  'planet-climate',
  'existential-threats',
  'science-technology',
  'general-news',
]

const LAYOUTS: LayoutVariant[] = ['A', 'B', 'C']

export default function HomePage() {
  const { data: issues } = usePublicIssues()
  const sortedIssues = [...(issues ?? [])].sort(
    (a, b) => ISSUE_ORDER.indexOf(a.slug) - ISSUE_ORDER.indexOf(b.slug),
  )

  // Fetch the most recent story across all categories for the hero
  const { data: latestData } = usePublicStories({ pageSize: 1 })
  const heroStory = latestData?.data?.[0] ?? null

  return (
    <>
      <Helmet>
        <title>Actually Relevant - News That Matters</title>
        <meta
          name="description"
          content="AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity."
        />
        <meta property="og:title" content="Actually Relevant - News That Matters" />
        <meta
          property="og:description"
          content="AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      {/* Hero */}
      {heroStory && <HeroSection story={heroStory} />}

      {/* Issue sections with rotating layouts */}
      <div className="page-section-wide">
        {sortedIssues.map((issue, idx) => {
          const layout = LAYOUTS[idx % LAYOUTS.length]
          const rank = idx < 2 ? idx + 2 : undefined
          const isLast = idx === sortedIssues.length - 1
          const divider: 'quote' | 'diamond' | 'none' = isLast
            ? 'none'
            : idx % 2 === 0
              ? 'quote'
              : 'diamond'

          return (
            <IssueSection
              key={issue.id}
              issue={issue}
              heroStoryId={heroStory?.id ?? null}
              layout={layout}
              rank={rank}
              divider={divider}
            />
          )
        })}

        {issues?.length === 0 && (
          <p className="text-center text-neutral-500 py-12">
            No stories published yet. Check back soon.
          </p>
        )}
      </div>
    </>
  )
}
