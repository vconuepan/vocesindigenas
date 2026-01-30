import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { usePublicIssues } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import type { PublicIssue } from '../lib/api'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'
import { formatDate } from '../lib/format'

function HeroSection({ story }: { story: PublicStory }) {
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const issueName = story.feed?.issue?.name ?? 'News'
  const colors = getCategoryColor(issueSlug)
  const dateStr = story.datePublished ? formatDate(story.datePublished) : null

  return (
    <section className="hero-section">
      <div className="hero-section-inner">
        {/* Category label */}
        <div className="flex items-center mb-4">
          <span className={`category-dot ${colors.dotBg}`} aria-hidden="true" />
          <Link
            to={`/issues/${issueSlug}`}
            className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
          >
            {issueName}
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
          <Link
            to={`/stories/${story.slug}`}
            className="hover:text-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {story.title || story.sourceTitle}
          </Link>
        </h1>

        {/* Source and date */}
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

        {/* Pull quote or summary */}
        {story.quote ? (
          <blockquote className="border-l-4 border-brand-300 pl-5 py-2 max-w-2xl">
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

function IssueSection({
  issue,
  heroStoryId,
  isLast,
}: {
  issue: PublicIssue
  heroStoryId: string | null
  isLast: boolean
}) {
  const { data } = usePublicStories({ issueSlug: issue.slug, pageSize: 5 })
  const allStories = data?.data ?? []

  // Exclude the hero story from this section
  const stories = heroStoryId
    ? allStories.filter((s) => s.id !== heroStoryId)
    : allStories

  if (stories.length === 0) return null

  const [featured, ...compact] = stories
  const colors = getCategoryColor(issue.slug)

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center">
            <span className={`category-dot ${colors.dotBg}`} aria-hidden="true" />
            <h2 className="text-2xl font-bold">{issue.name}</h2>
          </div>
          <Link
            to={`/issues/${issue.slug}`}
            className="text-sm text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Featured story takes 2 columns */}
          <div className="md:col-span-2">
            <StoryCard story={featured} variant="featured" />
          </div>
          {/* Compact stories stacked in the remaining column */}
          <div className="space-y-3">
            {compact.slice(0, 3).map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        </div>
      </section>

      {!isLast && <hr className="section-divider" />}
    </>
  )
}

const ISSUE_ORDER = [
  'human-development',
  'planet-climate',
  'existential-threats',
  'science-technology',
  'general-news',
]

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
          content="AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity's future."
        />
        <meta property="og:title" content="Actually Relevant - News That Matters" />
        <meta
          property="og:description"
          content="AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity's future."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      {/* Hero */}
      {heroStory && <HeroSection story={heroStory} />}

      {/* Issue sections */}
      <div className="page-section-wide">
        {sortedIssues.map((issue, idx) => (
          <IssueSection
            key={issue.id}
            issue={issue}
            heroStoryId={heroStory?.id ?? null}
            isLast={idx === sortedIssues.length - 1}
          />
        ))}

        {issues?.length === 0 && (
          <p className="text-center text-neutral-500 py-12">
            No stories published yet. Check back soon.
          </p>
        )}
      </div>
    </>
  )
}
