import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Markdown from 'react-markdown'
import { usePublicStory } from '../hooks/usePublicStories'
import { getCategoryColor } from '../lib/category-colors'

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: story, isLoading, error } = usePublicStory(slug || '')

  if (isLoading) {
    return (
      <div className="page-section text-center text-neutral-500">
        Loading story...
      </div>
    )
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

  const displayTitle = story.title || story.sourceTitle
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
  const issueSlug = story.feed?.issue?.slug ?? 'general-news'
  const issueName = story.feed?.issue?.name ?? 'News'
  const colors = getCategoryColor(issueSlug)

  return (
    <>
      <Helmet>
        <title>{displayTitle} - Actually Relevant</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta property="og:title" content={displayTitle} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://actuallyrelevant.news/stories/${story.slug}`} />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
        {story.datePublished && (
          <meta property="article:published_time" content={story.datePublished} />
        )}
      </Helmet>

      <article>
        {/* Article header with category accent */}
        <header className="border-b border-neutral-100 pb-8 mb-8">
          <div className="page-section !pb-0 !mb-0">
            {/* Category label */}
            <div className="flex items-center mb-6">
              <span className={`category-dot ${colors.dotBg}`} aria-hidden="true" />
              <Link
                to={`/issues/${issueSlug}`}
                className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
              >
                {issueName}
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              {displayTitle}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <time dateTime={displayDate}>{dateStr}</time>
              <span className="text-neutral-300">|</span>
              <span>
                Based on{' '}
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                >
                  {story.feed.title}
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
          {/* Key quote — prominent callout */}
          {story.quote && (
            <div className="pull-quote mb-10">
              <p>"{story.quote}"</p>
            </div>
          )}

          {/* Summary */}
          {story.summary && (
            <section className="mb-10">
              <div className="prose"><Markdown>{story.summary}</Markdown></div>
            </section>
          )}

          {/* Why This Matters */}
          {story.relevanceReasons && (
            <>
              <hr className="section-divider" />
              <section className="mb-10">
                <h2 className="section-heading">Why This Matters</h2>
                <div className="prose"><Markdown>{story.relevanceReasons}</Markdown></div>
              </section>
            </>
          )}

          {/* Caveats */}
          {story.antifactors && (
            <section className="mb-10">
              <h2 className="section-heading">Caveats</h2>
              <div className="prose"><Markdown>{story.antifactors}</Markdown></div>
            </section>
          )}

          {/* Back / category navigation */}
          <div className="border-t border-neutral-200 pt-6 flex flex-wrap gap-4 justify-between items-center">
            <Link
              to="/"
              className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              &larr; Back to all stories
            </Link>
            <Link
              to={`/issues/${issueSlug}`}
              className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              More in {issueName} &rarr;
            </Link>
          </div>
        </div>
      </article>
    </>
  )
}
