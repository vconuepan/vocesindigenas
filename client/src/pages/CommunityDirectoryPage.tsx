import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useCommunities } from '../hooks/useCommunities'
import { SEO, CommonOgTags } from '../lib/seo'
import type { Community } from '@shared/types'

function dotColor(type: Community['type']) {
  if (type === 'PUEBLO') return 'bg-brand-600'
  if (type === 'TERRITORIO') return 'bg-amber-500'
  return 'bg-emerald-600'
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      to={`/comunidad/${community.slug}`}
      className="group block bg-white border border-neutral-200 rounded-lg p-5 hover:border-brand-300 hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${dotColor(community.type)}`}
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

  const pueblos    = communities?.filter((c) => c.type === 'PUEBLO') ?? []
  const territorios = communities?.filter((c) => c.type === 'TERRITORIO') ?? []
  const causas     = communities?.filter((c) => c.type === 'CAUSA') ?? []

  return (
    <>
      <Helmet>
        <title>Comunidades — {SEO.siteName}</title>
        <meta
          name="description"
          content="Noticias curadas por IA organizadas por pueblo indígena, territorio y causa temática."
        />
        <meta property="og:title" content={`Comunidades — ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Noticias relevantes para pueblos, territorios y causas: Mapuche, Aymara, Amazonía, Andes, clima, derechos, paz."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/comunidades`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section-wide">
        <header className="mb-8">
          <h1 className="page-title">Comunidades</h1>
          <p className="text-neutral-500 mt-2 max-w-xl">
            Noticias curadas por IA organizadas por pueblo indígena, territorio y causa temática.
            Sin login, sin algoritmo personalizado — solo lo que es relevante para cada comunidad.
          </p>
          <div className="flex items-center gap-5 mt-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-600 inline-block" />Pueblos</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Territorios</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />Causas</span>
          </div>
        </header>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
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
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 inline-block" aria-hidden="true" />
                  Pueblos
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pueblos.map((c) => (
                    <CommunityCard key={c.slug} community={c} />
                  ))}
                </div>
              </section>
            )}

            {territorios.length > 0 && (
              <section className="mb-10">
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" aria-hidden="true" />
                  Territorios
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {territorios.map((c) => (
                    <CommunityCard key={c.slug} community={c} />
                  ))}
                </div>
              </section>
            )}

            {causas.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" aria-hidden="true" />
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
