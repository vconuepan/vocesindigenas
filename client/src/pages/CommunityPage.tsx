import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useCommunity, useCommunityStories } from '../hooks/useCommunities'
import StoryCard from '../components/StoryCard'
import Pagination from '../components/Pagination'
import { SEO, CommonOgTags } from '../lib/seo'
import type { PublicStory } from '@shared/types'

const PAGE_SIZE = 20

function StoryGrid({ stories }: { stories: PublicStory[] }) {
  if (stories.length === 0) return null
  const [first, ...rest] = stories
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        <div className="md:col-span-2">
          <StoryCard story={first} variant="featured" />
        </div>
        {rest.slice(0, 1).length > 0 && (
          <div className="space-y-3">
            {rest.slice(0, 4).map((s) => (
              <StoryCard key={s.id} story={s} variant="compact" />
            ))}
          </div>
        )}
      </div>
      {rest.length > 4 && (
        <div className="grid gap-5 md:grid-cols-3">
          {rest.slice(4).map((s) => (
            <StoryCard key={s.id} story={s} variant="equal" />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1

  const { data: community, isLoading: communityLoading, isError: communityError } = useCommunity(slug ?? '')
  const { data: storiesData, isLoading: storiesLoading } = useCommunityStories(slug ?? '', { page, pageSize: PAGE_SIZE })

  const isLoading = communityLoading || storiesLoading
  const stories = storiesData?.data ?? []
  const totalPages = storiesData?.totalPages ?? 1

  if (communityError || (!communityLoading && !community)) {
    return (
      <div className="page-section text-center">
        <h1 className="page-title">Comunidad no encontrada</h1>
        <p className="text-neutral-500 mb-6">Esta comunidad no existe o fue eliminada.</p>
        <Link to="/comunidades" className="text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1">
          &larr; Ver todas las comunidades
        </Link>
      </div>
    )
  }

  const ogTitle = community ? `${community.name} — ${SEO.siteName}` : SEO.siteName
  const ogDesc = community?.description ?? ''
  const ogImage = community?.imageUrl ?? undefined

  return (
    <>
      {community && (
        <Helmet>
          <title>{ogTitle}</title>
          <meta name="description" content={ogDesc.slice(0, 160)} />
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDesc.slice(0, 200)} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${SEO.siteUrl}/comunidad/${slug}`} />
          {CommonOgTags({ image: ogImage })}
        </Helmet>
      )}

      <div className="page-section-wide">
        {/* Breadcrumb */}
        <Link
          to="/comunidades"
          className="text-xs text-brand-700 hover:text-brand-800 font-normal focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5 mb-3 inline-block"
        >
          &larr; Comunidades
        </Link>

        {/* Header */}
        {isLoading && !community ? (
          <div className="mb-6">
            <div className="h-7 w-48 bg-neutral-100 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-neutral-100 rounded animate-pulse" />
          </div>
        ) : community && (
          <header className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${community.type === 'PUEBLO' ? 'bg-brand-600' : 'bg-emerald-600'}`}
                aria-hidden="true"
              />
              <h1 className="text-xl md:text-2xl font-bold">{community.name}</h1>
            </div>
            {community.region && (
              <p className="text-xs text-neutral-400 ml-5">{community.region}</p>
            )}
            <p className="text-sm text-neutral-600 mt-2 ml-5 max-w-2xl">{community.description}</p>
          </header>
        )}

        {/* Stories */}
        {storiesLoading && (
          <div className="grid gap-5 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!storiesLoading && stories.length > 0 && (
          <>
            <StoryGrid stories={stories} />
            <Pagination
              page={storiesData?.page ?? 1}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setSearchParams((prev) => {
                  if (newPage === 1) prev.delete('page')
                  else prev.set('page', String(newPage))
                  return prev
                })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </>
        )}

        {!storiesLoading && stories.length === 0 && (
          <p className="text-neutral-500 py-8 text-center">
            Aún no hay noticias publicadas para esta comunidad.
          </p>
        )}
      </div>
    </>
  )
}
