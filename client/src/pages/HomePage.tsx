import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { usePublicIssues } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import type { PublicIssue } from '../lib/api'

function IssueSection({ issue }: { issue: PublicIssue }) {
  const { data } = usePublicStories({ issueSlug: issue.slug, pageSize: 3 })
  const stories = data?.data ?? []

  if (stories.length === 0) return null

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
      <p className="text-neutral-500 text-sm mb-4 line-clamp-2">{issue.description}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { data: issues } = usePublicIssues()

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
      <div className="bg-brand-50 py-12 md:py-20">
        <div className="page-section-wide !py-0">
          <h1 className="page-title">News That Actually Matters</h1>
          <p className="page-intro">
            We use AI to evaluate thousands of articles and surface the stories most
            relevant to humanity and its long-term future.
          </p>
        </div>
      </div>

      {/* Issue sections */}
      <div className="page-section-wide">
        {issues?.map((issue) => (
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
