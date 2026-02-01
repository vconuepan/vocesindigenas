import { Link } from 'react-router-dom'
import type { PublicStory } from '@shared/types'
import { getCategoryColor } from '../lib/category-colors'

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

  const issueSlug = story.issue?.slug ?? story.feed?.issue?.slug ?? 'general-news'
  const colors = getCategoryColor(issueSlug)

  const attribution = (
    <footer className="mt-3 text-sm text-neutral-500">
      &mdash; from{' '}
      <Link
        to={`/stories/${story.slug}`}
        className="text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
      >
        {story.title || story.sourceTitle}
      </Link>
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
            <p className="text-xl md:text-2xl italic text-neutral-700 leading-relaxed px-4">
              {story.quote}
            </p>
          </blockquote>
          {attribution}
        </div>
      </div>
    )
  }

  // === HIGHLIGHT variant (colored strip) ===
  return (
    <div className={`py-8 md:py-10 my-6 md:my-8 ${colors.bg} rounded-lg`}>
      <div className="max-w-2xl mx-auto text-center px-6">
        <blockquote>
          <p className="text-xl md:text-2xl italic text-neutral-800 leading-relaxed">
            &ldquo;{story.quote}&rdquo;
          </p>
        </blockquote>
        {attribution}
      </div>
    </div>
  )
}

/**
 * Select a pull-quote variant based on section index for visual rotation.
 */
const VARIANT_ROTATION: PullQuoteVariant[] = ['centered', 'highlight']

export function getQuoteVariant(index: number): PullQuoteVariant {
  return VARIANT_ROTATION[index % VARIANT_ROTATION.length]
}
