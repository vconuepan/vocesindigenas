import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useCommunities } from '../hooks/useCommunities'
import { SEO, CommonOgTags } from '../lib/seo'
import type { Community } from '@shared/types'

function CommunityCard({ community }: { community: Community }) {
  const isPueblo = community.type === 'PUEBLO'
  return (
    <Link
      to={`/comunidad/${community.slug}`}
      className="group block bg-white border border-neutral-200 rounded-lg p-5 hover:border-brand-300 hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${isPueblo ? 'bg-brand-600' : 'bg-emerald-600'}`}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-bold text-neutral-900 group-hover:text-brand-700 transition-colors">
            {community.name}
          </h2>
          {community.region && (
            <p className="text-xs text-neutral-400 mt-0.5">{community.region}</p>
          )}
          <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{community.description}</p>
          <span className="inline-block mt-3 text-xs font-semibold text-brand-700 group-hover:underline">
            Ver noticias &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CommunityDirectoryPage() {
  const { data: communities, isLoading, isError } = useCommunities()

  const pueblos = communities?.filter((c) => c.type === 'PUEBLO') ?? []
  const causas = communities?.filter((c) => c.type === 'CAUSA') ?? []

  return (
    <>
      <Helmet>
        <title>Comunidades — {SEO.siteName}</title>
        <meta
          name="description"
          content="Noticias curadas por IA organizadas por pueblo indígena y causa temática."
        />
        <meta property="og:title" content={`Comunidades — ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Noticias relevantes para cada pueblo indígena y causa: clima, derechos, paz, emprendimiento."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/comunidades`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section-wide">
        <header className="mb-8">
          <h1 className="page-title">Comunidades</h1>
          <p className="text-neutral-500 mt-2 max-w-xl">
            Noticias curadas por IA organizadas por pueblo indígena y causa temática.
            Sin login, sin algoritmo personalizado — solo lo que es relevante para cada comunidad.
          </p>
        </header>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-neutral-500 py-8 text-center">
            Error al cargar las comunidades. Intenta de nuevo.
          </p>
        )}

        {!isLoading && !isError && communities && (
          <>
            {pueblos.length > 0 && (
              <section className="mb-10">
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                  Pueblos
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pueblos.map((c) => (
                    <CommunityCard key={c.slug} community={c} />
                  ))}
                </div>
              </section>
            )}

            {causas.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                  Causas
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {causas.map((c) => (
                    <CommunityCard key={c.slug} community={c} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
