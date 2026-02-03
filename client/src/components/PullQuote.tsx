import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'

type PullQuoteVariant = 'centered' | 'highlight'

interface PullQuoteProps {
  story: PublicStory
  variant?: PullQuoteVariant
}

/**
 * Displays a pull-quote from a story in one of two visual styles.
 *
 * - **centered**: Large centered text with oversized decorative quotation marks.
 * - **highlight**: Full-width category-tinted strip with centered quote.
 */
export default function PullQuote({ story, variant = 'centered' }: PullQuoteProps) {
  if (!story.quote) return null

  const hasPersonAttribution = story.quoteAttribution && story.quoteAttribution !== 'Original article'

  const attribution = (
    <footer className="mt-3 text-sm text-neutral-500">
      &mdash;{' '}
      {hasPersonAttribution ? (
        <>
          {story.quoteAttribution}, via{' '}
          <Link
            to={`/stories/${story.slug}`}
            className="text-brand-700 hover:text-brand-800 underline decoration-brand-300 hover:decoration-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
          >
            {story.title || story.sourceTitle}
          </Link>
        </>
      ) : (
        <>
          from{' '}
          <Link
            to={`/stories/${story.slug}`}
            className="text-brand-700 hover:text-brand-800 underline decoration-brand-300 hover:decoration-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
          >
            {story.title || story.sourceTitle}
          </Link>
        </>
      )}
    </footer>
  )

  // === CENTERED variant (editorial) ===
  if (variant === 'centered') {
    return (
      <div className="py-8 md:py-10 text-center max-w-2xl mx-auto">
        <div className="relative">
          {/* Large decorative open-quote */}
          <span
            aria-hidden="true"
            className="block text-brand-200 leading-none select-none pointer-events-none"
            style={{ fontSize: '6rem', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            &ldquo;
          </span>
          <blockquote className="-mt-8">
            {/* No italic — avoids loading Roboto-Italic; decorative quotes provide visual distinction */}
            <p className="text-xl md:text-2xl text-neutral-700 leading-relaxed px-4">
              {story.quote}
            </p>
          </blockquote>
          {attribution}
        </div>
      </div>
    )
  }

  // Only centered variant is used — always the big decorative quotation mark style.
  return null
}

/**
 * Select a pull-quote variant based on section index for visual rotation.
 * Currently always returns 'centered' (large decorative quotation mark).
 */
export function getQuoteVariant(_index: number): PullQuoteVariant {
  return 'centered'
}
