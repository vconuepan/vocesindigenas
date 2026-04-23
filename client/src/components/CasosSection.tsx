/**
 * CasosSection — "Casos en curso" editorial groupings band.
 *
 * Sits between SpotlightBand and the issue feed on the homepage.
 * Shows all active ongoing cases with title, description preview,
 * and story count. Renders nothing when there are no active cases.
 */
import { Link } from 'react-router-dom'
import type { CaseListItem } from '../lib/api'

interface Props {
  cases: CaseListItem[]
}

export default function CasosSection({ cases }: Props) {
  if (cases.length === 0) return null

  return (
    <div
      className="w-full border-b border-neutral-200 bg-neutral-50"
      role="region"
      aria-label="Casos en curso"
    >
      <div className="max-w-5xl mx-auto px-4 py-5 md:py-6">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 whitespace-nowrap">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
              aria-hidden="true"
            />
            Casos en curso
          </span>
          <div className="flex-1 border-t border-neutral-300" aria-hidden="true" />
          <Link
            to="/casos"
            className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors shrink-0"
          >
            Ver todos
          </Link>
        </div>

        {/* Case cards */}
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/caso/${c.slug}`}
              className="flex-1 group flex gap-3 rounded-lg border border-neutral-200 bg-white p-3 md:p-4 hover:border-amber-300 hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {/* Accent bar */}
              <div className="w-0.5 shrink-0 rounded-full bg-amber-400 self-stretch" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="mt-1 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                )}
                {c.storyCount > 0 && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    {c.storyCount} {c.storyCount === 1 ? 'nota' : 'notas'}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
