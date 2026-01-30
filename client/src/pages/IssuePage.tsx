import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { API_BASE } from '../lib/api'
import { usePublicIssue } from '../hooks/usePublicIssues'
import { usePublicStories } from '../hooks/usePublicStories'
import { getCategoryColor } from '../lib/category-colors'
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
  const colors = getCategoryColor(slug ?? 'general-news')

  // Split stories into featured row (page 1) and remaining grid
  const isFirstPage = page === 1
  const featured = isFirstPage ? stories[0] ?? null : null
  const sidebar = isFirstPage ? stories.slice(1, 4) : []
  const gridStories = isFirstPage ? stories.slice(4) : stories

  // Only show children with published stories
  const activeChildren = (issue.children ?? []).filter(
    (child) => (child.publishedStoryCount ?? 0) > 0,
  )

  const hasAboutContent =
    (issue.evaluationCriteria?.length ?? 0) > 0 ||
    (issue.sourceNames?.length ?? 0) > 0 ||
    (issue.makeADifference?.length ?? 0) > 0

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
        <link rel="alternate" type="application/rss+xml" title={`${issue.name} RSS Feed`} href={`${API_BASE}/feed/${slug}`} />
      </Helmet>

      <div className="page-section-wide">
        {/* Header — compact inline */}
        <header className="mb-5">
          {issue.parent && (
            <Link
              to={`/issues/${issue.parent.slug}`}
              className="text-xs text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5 mb-1 inline-block"
            >
              &larr; {issue.parent.name}
            </Link>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colors.dotBg} shrink-0`} aria-hidden="true" />
              <h1 className="text-xl md:text-2xl font-bold">{issue.name}</h1>
            </div>
            <a
              href={`${API_BASE}/feed/${slug}`}
              className="shrink-0 p-1.5 text-neutral-400 hover:text-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              title={`RSS feed for ${issue.name}`}
              aria-label={`RSS feed for ${issue.name}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
              </svg>
            </a>
          </div>
          {(issue.intro || issue.description) && (
            <p className="hidden md:block text-sm text-neutral-500 mt-1 line-clamp-2">
              {issue.intro || issue.description}
            </p>
          )}
        </header>

        {/* Sub-topics — only those with stories */}
        {activeChildren.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {activeChildren.map((child) => {
              const childColors = getCategoryColor(child.slug)
              return (
                <Link
                  key={child.slug}
                  to={`/issues/${child.slug}`}
                  className="inline-flex items-center gap-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-sm font-medium px-3 py-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${childColors.dotBg}`} aria-hidden="true" />
                  {child.name}
                </Link>
              )
            })}
          </div>
        )}

        {/* Stories — magazine layout */}
        {stories.length > 0 ? (
          <>
            {/* Featured row (first page only) */}
            {isFirstPage && featured && (
              <div className="grid gap-5 md:grid-cols-3 mb-5">
                <div className="md:col-span-2">
                  <StoryCard story={featured} variant="featured" />
                </div>
                {sidebar.length > 0 && (
                  <div className="space-y-3">
                    {sidebar.map((story) => (
                      <StoryCard key={story.id} story={story} variant="compact" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Remaining stories grid */}
            {gridStories.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {gridStories.map((story) => (
                  <StoryCard key={story.id} story={story} variant="compact" />
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <p className="text-neutral-500 py-8 text-center">
            No stories published yet in this category.
          </p>
        )}

        {/* About this issue — collapsible */}
        {hasAboutContent && (
          <>
            <hr className="section-divider" />
            <details className="group mb-8">
              <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-500 uppercase tracking-wide py-3 list-none flex items-center gap-2 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                About {issue.name}
              </summary>

              <div className="pt-4 pb-2 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {/* Evaluation criteria */}
                {issue.evaluationCriteria?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-700 mb-2">How We Evaluate</h3>
                    {issue.evaluationIntro && (
                      <p className="text-sm text-neutral-500 mb-2">{issue.evaluationIntro}</p>
                    )}
                    <ol className="list-decimal list-inside space-y-1 text-sm text-neutral-600">
                      {issue.evaluationCriteria.map((criterion, i) => (
                        <li key={i}>{criterion}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Sources */}
                {issue.sourceNames?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-700 mb-2">Our Sources</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {issue.sourceNames.map((source) => (
                        <span
                          key={source}
                          className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Make a difference */}
                {issue.makeADifference?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-700 mb-2">Make a Difference</h3>
                    <ul className="space-y-1">
                      {issue.makeADifference.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                          >
                            {link.label}
                            <span className="sr-only"> (opens in new tab)</span>
                            {' '}&rarr;
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </>
  )
}
