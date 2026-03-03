import { Fragment } from 'react'
import { useClusterMembers } from '../hooks/usePublicStories'

export default function AlsoCoveredBy({ slug }: { slug: string }) {
  const { data } = useClusterMembers(slug)

  if (!data?.sources?.length) return null

  return (
    <p className="text-sm text-neutral-500 mt-4">
      Tambien cubierto por:{' '}
      {data.sources.map((s, i) => (
        <Fragment key={s.sourceUrl}>
          {i > 0 && ', '}
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
          >
            {s.feedTitle}
            <span className="sr-only"> (abre en nueva pestana)</span>
          </a>
        </Fragment>
      ))}
    </p>
  )
}
