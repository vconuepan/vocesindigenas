/**
 * Maps issue slugs to subtle accent colors for visual differentiation.
 * Used as thin borders, dots, and small accents — not backgrounds.
 */

export interface CategoryColor {
  /** Tailwind border class, e.g. "border-amber-500" */
  border: string
  /** Tailwind text class for dot/accent, e.g. "text-amber-500" */
  dot: string
  /** Tailwind bg class for light accent, e.g. "bg-amber-50" */
  bg: string
  /** Tailwind bg class for the dot itself */
  dotBg: string
}

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'human-development': {
    border: 'border-amber-400',
    dot: 'text-amber-500',
    bg: 'bg-amber-50',
    dotBg: 'bg-amber-400',
  },
  'planet-climate': {
    border: 'border-teal-400',
    dot: 'text-teal-500',
    bg: 'bg-teal-50',
    dotBg: 'bg-teal-400',
  },
  'existential-threats': {
    border: 'border-red-400',
    dot: 'text-red-500',
    bg: 'bg-red-50',
    dotBg: 'bg-red-400',
  },
  'science-technology': {
    border: 'border-indigo-400',
    dot: 'text-indigo-500',
    bg: 'bg-indigo-50',
    dotBg: 'bg-indigo-400',
  },
  'general-news': {
    border: 'border-brand-400',
    dot: 'text-brand-500',
    bg: 'bg-brand-50',
    dotBg: 'bg-brand-400',
  },
}

const DEFAULT_COLOR: CategoryColor = CATEGORY_COLORS['general-news']

export function getCategoryColor(issueSlug: string): CategoryColor {
  return CATEGORY_COLORS[issueSlug] ?? DEFAULT_COLOR
}
