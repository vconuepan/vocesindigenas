import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { usePublicStories } from '../hooks/usePublicStories'
import StoryCard from '../components/StoryCard'
import Pagination from '../components/Pagination'
import { SearchResultsSkeleton } from '../components/skeletons'
import { SEO, CommonOgTags } from '../lib/seo'
export default function SearchPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [q])
  const { data, isLoading } = usePublicStories({
    search: q || undefined,
    page,
    pageSize: 12,
  })
  const stories = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  return (
    <>
      <Helmet>
        <title>{q ? t('search.title', { q }) : t('search.label')} - {SEO.siteName}</title>
        <meta name="description" content={q ? t('search.pageTitle', { q }) : t('search.defaultTitle')} />
        <meta property="og:title" content={q ? `${t('search.title', { q })} - ${SEO.siteName}` : `${t('search.label')} - ${SEO.siteName}`} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SEO.siteUrl}/search`} />
        <meta name="robots" content="noindex, follow" />
        {CommonOgTags({})}
      </Helmet>
      <div className="page-section-wide">
        <header className="mb-8 border-b border-neutral-100 pb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">{t('search.label')}</p>
          <h1 className="text-2xl md:text-3xl font-bold">
            {q ? (
              <>{t('search.resultsFor', { q })}</>
            ) : (
              t('search.defaultTitle') || 'Buscar noticias'
            )}
          </h1>
          {q && !isLoading && (
            <p className="text-sm text-neutral-500 mt-1">
              {t('search.results_other', { count: data?.total ?? 0 })}
            </p>
          )}
        </header>
        {!q ? (
          <p className="text-neutral-500 text-center py-8">{t('search.empty')}</p>
        ) : isLoading ? (
          <SearchResultsSkeleton />
        ) : stories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-500 mb-4">{t('search.noResults', { q })}</p>
            <Link
              to="/"
              className="text-brand-800 hover:text-brand-700 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
            >
              {t('search.backToHome')}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} variant="equal" />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}
