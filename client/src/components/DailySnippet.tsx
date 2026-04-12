import { getDailySnippet, SNIPPETS_BY_ISSUE, SNIPPETS_GENERAL } from '../data/snippets'
import type { Snippet } from '../data/snippets'

interface DailySnippetProps {
  issueSlug?: string
  className?: string
}

/**
 * Displays a daily-rotating "always true" editorial statement.
 * If `issueSlug` is provided, picks from that issue's pool (falling back to
 * general pool if none defined). Otherwise uses the general pool.
 */
export default function DailySnippet({ issueSlug, className = '' }: DailySnippetProps) {
  const pool = (issueSlug && SNIPPETS_BY_ISSUE[issueSlug]) || SNIPPETS_GENERAL
  const snippet: Snippet = getDailySnippet(pool)

  return (
    <div className={`py-8 md:py-10 text-center max-w-2xl mx-auto ${className}`}>
      <blockquote>
        <p className="text-lg md:text-xl text-neutral-600 leading-relaxed italic px-4">
          {snippet.text}
        </p>
        {snippet.source && (
          <footer className="mt-3 text-sm text-neutral-400 not-italic">
            — {snippet.source}
          </footer>
        )}
      </blockquote>
    </div>
  )
}
