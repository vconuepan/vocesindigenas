import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePublicIssue } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import Pagination from '../components/Pagination'

export default function IssuePage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState(1)
  const { data: issue, isLoading, isError } = usePublicIssue(slug ?? '')
  const { data: storiesData } = usePublicStories({
    issueSlug: slug,
    page,
    pageSize: 12,
  })

  if (isLoading) {
    return (
      <div className="page-section text-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (isError || !issue) {
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
  const hasContent = issue.intro || issue.evaluationCriteria?.length > 0

  return (
    <>
      <Helmet>
        <title>{issue.name} - Actually Relevant</title>
        <meta name="description" content={(issue.intro || issue.description).slice(0, 160)} />
        <meta property="og:title" content={`${issue.name} - Actually Relevant`} />
        <meta property="og:description" content={(issue.intro || issue.description).slice(0, 200)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://actuallyrelevant.news/issues/${slug}`} />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      {/* Header */}
      <div className="bg-brand-50 py-10 md:py-14">
        <div className="page-section-wide !py-0">
          {issue.parent && (
            <Link
              to={`/issues/${issue.parent.slug}`}
              className="text-sm text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 mb-2 inline-block"
            >
              &larr; {issue.parent.name}
            </Link>
          )}
          <h1 className="page-title">{issue.name}</h1>
          <p className="page-intro">{issue.intro || issue.description}</p>
        </div>
      </div>

      <div className="page-section-wide">
        {/* Child issues navigation */}
        {issue.children && issue.children.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Sub-topics</h2>
            <div className="flex flex-wrap gap-2">
              {issue.children.map(child => (
                <Link
                  key={child.slug}
                  to={`/issues/${child.slug}`}
                  className="bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium px-3 py-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </section>
        )}

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
        {hasContent && issue.evaluationCriteria?.length > 0 && (
          <section className="mb-12">
            <h2 className="section-heading-lg">How We Evaluate</h2>
            {issue.evaluationIntro && <p className="prose mb-4">{issue.evaluationIntro}</p>}
            <ol className="list-decimal list-inside space-y-3 text-neutral-600">
              {issue.evaluationCriteria.map((criterion, i) => (
                <li key={i} className="leading-relaxed">{criterion}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Sources */}
        {issue.sourceNames?.length > 0 && (
          <section className="mb-12">
            <h2 className="section-heading-lg">Our Sources</h2>
            <div className="flex flex-wrap gap-2">
              {issue.sourceNames.map((source) => (
                <span
                  key={source}
                  className="bg-neutral-100 text-neutral-600 text-sm px-3 py-1 rounded-full"
                >
                  {source}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Make a difference */}
        {issue.makeADifference?.length > 0 && (
          <section className="mb-12 bg-brand-50 rounded-lg p-6 md:p-8">
            <h2 className="section-heading-lg !mb-4">Make a Difference</h2>
            <p className="prose mb-6">
              If you believe this issue matters, why not make it your job? Or donate
              to effective charities? Here are some links to get you started.
            </p>
            <ul className="space-y-2">
              {issue.makeADifference.map((link) => (
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
