/**
 * Inline SVG pattern backgrounds unique to each issue category.
 * Used as decorative fills on featured cards and the homepage hero.
 *
 * Each component renders an absolutely-positioned SVG that fills its
 * nearest positioned ancestor. Wrap in a `relative overflow-hidden`
 * container and layer content on top with `relative z-10`.
 */

interface PatternProps {
  className?: string
  /** SVG fill opacity (0–1). Default 0.18 */
  opacity?: number
}

const base = 'absolute inset-0 w-full h-full pointer-events-none select-none'

// ---------------------------------------------------------------------------
// Human Development — concentric arcs radiating from bottom-left
// ---------------------------------------------------------------------------

export function HumanDevelopmentPattern({ className = '', opacity = 0.18 }: PatternProps) {

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="#fbbf24" strokeWidth="2.5" opacity={opacity}>
        {[120, 200, 280, 360, 440, 520, 600].map((r) => (
          <circle key={r} cx="0" cy="400" r={r} />
        ))}
      </g>
      <g fill="#fbbf24" opacity={opacity * 0.7}>
        <circle cx="680" cy="60" r="30" />
        <circle cx="730" cy="150" r="16" />
        <circle cx="600" cy="90" r="10" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Planet & Climate — concentric atmospheric rings
// ---------------------------------------------------------------------------

export function PlanetClimatePattern({ className = '', opacity = 0.18 }: PatternProps) {

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Concentric rings — atmospheric layers around a planet core */}
      <g fill="none" stroke="#2dd4bf" strokeWidth="2.5" opacity={opacity}>
        {[60, 100, 140, 180, 220, 260].map((r) => (
          <circle key={r} cx="500" cy="300" r={r} />
        ))}
      </g>
      {/* Accent dots — scattered like stars */}
      <g fill="#2dd4bf" opacity={opacity * 0.6}>
        <circle cx="140" cy="70" r="18" />
        <circle cx="80" cy="180" r="10" />
        <circle cx="240" cy="40" r="8" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Existential Threats — angular shards / fractured geometry
// ---------------------------------------------------------------------------

export function ExistentialThreatsPattern({ className = '', opacity = 0.18 }: PatternProps) {

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="#f87171" strokeWidth="2" opacity={opacity}>
        <path d="M100,0 L250,180 L50,400" />
        <path d="M300,0 L400,200 L200,400" />
        <path d="M500,0 L650,220 L450,400" />
        <path d="M700,0 L800,160 L650,400" />
        <path d="M0,100 L200,50 L400,120 L600,30 L800,100" />
        <path d="M0,300 L200,350 L400,280 L600,370 L800,300" />
      </g>
      <g fill="#f87171" opacity={opacity * 0.5}>
        <polygon points="680,30 730,110 630,110" />
        <polygon points="110,310 170,390 50,390" />
        <polygon points="400,180 430,230 370,230" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Science & Technology — circuit grid / dot matrix
// ---------------------------------------------------------------------------

export function ScienceTechnologyPattern({ className = '', opacity = 0.18 }: PatternProps) {

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Incomplete circuit grid — broken line segments with squares at active intersections */}
      <g stroke="#818cf8" strokeWidth="1.5" fill="none" opacity={opacity}>
        {/* Horizontal segments (not full lines) */}
        <line x1="120" y1="80" x2="320" y2="80" />
        <line x1="440" y1="80" x2="560" y2="80" />
        <line x1="200" y1="160" x2="560" y2="160" />
        <line x1="120" y1="240" x2="320" y2="240" />
        <line x1="440" y1="240" x2="680" y2="240" />
        <line x1="320" y1="320" x2="560" y2="320" />
        {/* Vertical segments (not full lines) */}
        <line x1="200" y1="40" x2="200" y2="160" />
        <line x1="320" y1="80" x2="320" y2="320" />
        <line x1="440" y1="80" x2="440" y2="240" />
        <line x1="560" y1="160" x2="560" y2="360" />
      </g>
      {/* Squares only at actual intersections */}
      <g fill="#818cf8" opacity={opacity * 0.7}>
        <rect x="196" y="76" width="8" height="8" />
        <rect x="316" y="76" width="8" height="8" />
        <rect x="436" y="76" width="8" height="8" />
        <rect x="196" y="156" width="8" height="8" />
        <rect x="316" y="156" width="8" height="8" />
        <rect x="436" y="156" width="8" height="8" />
        <rect x="556" y="156" width="8" height="8" />
        <rect x="316" y="236" width="8" height="8" />
        <rect x="436" y="236" width="8" height="8" />
        <rect x="556" y="316" width="8" height="8" />
        <rect x="316" y="316" width="8" height="8" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

const PATTERN_MAP: Record<string, React.ComponentType<PatternProps>> = {
  'human-development': HumanDevelopmentPattern,
  'planet-climate': PlanetClimatePattern,
  'existential-threats': ExistentialThreatsPattern,
  'science-technology': ScienceTechnologyPattern,
}

/**
 * Returns the SVG pattern component for a given issue slug.
 * Returns undefined for unknown slugs (callers should handle missing patterns).
 */
export function getCategoryPattern(issueSlug: string): React.ComponentType<PatternProps> | undefined {
  return PATTERN_MAP[issueSlug]
}
