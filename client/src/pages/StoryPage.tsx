import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePublicStory } from '../hooks/usePublicStories'
import EmotionBadge from '../components/EmotionBadge'
import RatingDisplay from '../components/RatingDisplay'

export default function StoryPage() {
  const { id } = useParams<{ id: string }>()
  const { data: story, isLoading, error } = usePublicStory(id || '')

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

  const dateStr = story.datePublished
    ? new Date(story.datePublished).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const description = story.aiSummary || story.title

  return (
    <>
      <Helmet>
        <title>{story.title} - Actually Relevant</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta property="og:title" content={story.title} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://actuallyrelevant.news/stories/${story.id}`} />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
        {story.datePublished && (
          <meta property="article:published_time" content={story.datePublished} />
        )}
        {story.aiKeywords?.map((kw) => (
          <meta key={kw} property="article:tag" content={kw} />
        ))}
      </Helmet>

      <article className="page-section">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{story.title}</h1>

          <div className="flex items-center gap-3 flex-wrap text-sm text-neutral-500">
            {story.emotionTag && <EmotionBadge emotion={story.emotionTag} />}
            <RatingDisplay low={story.relevanceRatingLow} high={story.relevanceRatingHigh} />
            {dateStr && <time dateTime={story.datePublished || undefined}>{dateStr}</time>}
          </div>
        </header>

        {/* Summary */}
        {story.aiSummary && (
          <section className="mb-8">
            <h2 className="section-heading">Summary</h2>
            <p className="prose">{story.aiSummary}</p>
          </section>
        )}

        {/* Key quote */}
        {story.aiQuote && (
          <blockquote className="border-l-4 border-brand-300 pl-4 py-2 my-8 italic text-neutral-700">
            "{story.aiQuote}"
          </blockquote>
        )}

        {/* Marketing blurb */}
        {story.aiMarketingBlurb && (
          <section className="mb-8 bg-brand-50 rounded-lg p-6">
            <p className="text-brand-800 font-medium">{story.aiMarketingBlurb}</p>
          </section>
        )}

        {/* Relevance analysis */}
        {story.aiRelevanceReasons && (
          <section className="mb-8">
            <h2 className="section-heading">Why This Matters</h2>
            <p className="prose">{story.aiRelevanceReasons}</p>
          </section>
        )}

        {story.aiAntifactors && (
          <section className="mb-8">
            <h2 className="section-heading">Caveats</h2>
            <p className="prose">{story.aiAntifactors}</p>
          </section>
        )}

        {story.aiScenarios && (
          <section className="mb-8">
            <h2 className="section-heading">Scenarios</h2>
            <p className="prose">{story.aiScenarios}</p>
          </section>
        )}

        {/* Keywords */}
        {story.aiKeywords && story.aiKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {story.aiKeywords.map((kw) => (
              <span
                key={kw}
                className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Read original */}
        <div className="border-t border-neutral-200 pt-6 mt-8">
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Read original article
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            to="/"
            className="text-brand-700 hover:text-brand-800 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          >
            &larr; Back to all stories
          </Link>
        </div>
      </article>
    </>
  )
}
