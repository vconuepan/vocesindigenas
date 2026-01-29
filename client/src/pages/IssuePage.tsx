import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import Pagination from '../components/Pagination'
import { getIssueContent } from '../data/issues-content'

export default function IssuePage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState(1)
  const { data: storiesData } = usePublicStories({
    issueSlug: slug,
    page,
    pageSize: 12,
  })

  const content = slug ? getIssueContent(slug) : undefined

  if (!content) {
    return (
      <div className="page-section text-center">
        <h1 className="page-title">Issue Not Found</h1>
        <p className="text-neutral-500 mb-6">This issue category does not exist.</p>
        <Link
          to="/issues"
          className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        >
          &larr; View all issues
        </Link>
      </div>
    )
  }

  const stories = storiesData?.data ?? []
  const totalPages = storiesData?.totalPages ?? 1

  return (
    <>
      <Helmet>
        <title>{content.name} - Actually Relevant</title>
        <meta name="description" content={content.intro.slice(0, 160)} />
        <meta property="og:title" content={`${content.name} - Actually Relevant`} />
        <meta property="og:description" content={content.intro.slice(0, 200)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://actuallyrelevant.news/issues/${slug}`} />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      {/* Header */}
      <div className="bg-brand-50 py-10 md:py-14">
        <div className="page-section-wide !py-0">
          <h1 className="page-title">{content.name}</h1>
          <p className="page-intro">{content.intro}</p>
        </div>
      </div>

      <div className="page-section-wide">
        {/* Latest Stories */}
        <section className="mb-12">
          <h2 className="section-heading-lg">Latest Stories</h2>
          <p className="text-neutral-500 mb-6">
            We believe that every story on our website will be more relevant to humanity
            than 90% of the stories in your daily newspaper.
          </p>
          {stories.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-neutral-500">No stories published yet in this category.</p>
          )}
        </section>

        {/* How we evaluate */}
        <section className="mb-12">
          <h2 className="section-heading-lg">How We Evaluate</h2>
          <p className="prose mb-4">{content.evaluationIntro}</p>
          <ol className="list-decimal list-inside space-y-3 text-neutral-600">
            {content.evaluationCriteria.map((criterion, i) => (
              <li key={i} className="leading-relaxed">{criterion}</li>
            ))}
          </ol>
        </section>

        {/* Sources */}
        <section className="mb-12">
          <h2 className="section-heading-lg">Our Sources</h2>
          <div className="flex flex-wrap gap-2">
            {content.sources.map((source) => (
              <span
                key={source}
                className="bg-neutral-100 text-neutral-600 text-sm px-3 py-1 rounded-full"
              >
                {source}
              </span>
            ))}
          </div>
        </section>

        {/* Make a difference */}
        {content.makeADifference.length > 0 && (
          <section className="mb-12 bg-brand-50 rounded-lg p-6 md:p-8">
            <h2 className="section-heading-lg !mb-4">Make a Difference</h2>
            <p className="prose mb-6">
              If you believe this issue matters, why not make it your job? Or donate
              to effective charities? Here are some links to get you started.
            </p>
            <ul className="space-y-2">
              {content.makeADifference.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:text-brand-800 font-medium underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {link.label} &rarr;
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
