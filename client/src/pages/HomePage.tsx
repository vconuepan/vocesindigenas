import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { usePublicIssues } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import type { PublicIssue } from '../lib/api'

function IssueSection({ issue }: { issue: PublicIssue }) {
  const { data } = usePublicStories({ issueSlug: issue.slug, pageSize: 4 })
  const stories = data?.data ?? []

  if (stories.length === 0) return null

  const [featured, ...compact] = stories

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="section-heading">{issue.name}</h2>
        <Link
          to={`/issues/${issue.slug}`}
          className="text-sm text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="space-y-4">
        <StoryCard story={featured} variant="featured" />
        {compact.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {compact.map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const ISSUE_ORDER = ['human-development', 'planet-climate', 'existential-threats', 'science-technology', 'general-news']

export default function HomePage() {
  const { data: issues } = usePublicIssues()
  const sortedIssues = [...(issues ?? [])].sort(
    (a, b) => ISSUE_ORDER.indexOf(a.slug) - ISSUE_ORDER.indexOf(b.slug),
  )

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

      {/* Issue sections */}
      <div className="page-section-wide">
        {sortedIssues.map((issue) => (
          <IssueSection key={issue.id} issue={issue} />
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
