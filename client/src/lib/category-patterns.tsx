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
// Planet & Climate — layered wave forms
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
      <g fill="none" stroke="#2dd4bf" strokeWidth="2.5" opacity={opacity}>
        <path d="M0,320 C100,280 200,350 300,310 C400,270 500,340 600,300 C700,260 800,330 800,300" />
        <path d="M0,280 C100,240 200,310 300,270 C400,230 500,300 600,260 C700,220 800,290 800,260" />
        <path d="M0,240 C100,200 200,270 300,230 C400,190 500,260 600,220 C700,180 800,250 800,220" />
        <path d="M0,200 C100,160 200,230 300,190 C400,150 500,220 600,180 C700,140 800,210 800,180" />
        <path d="M0,160 C100,120 200,190 300,150 C400,110 500,180 600,140 C700,100 800,170 800,140" />
        <path d="M0,120 C100,80 200,150 300,110 C400,70 500,140 600,100 C700,60 800,130 800,100" />
      </g>
      <g fill="#2dd4bf" opacity={opacity * 0.6}>
        <circle cx="150" cy="70" r="22" />
        <circle cx="650" cy="50" r="14" />
        <circle cx="400" cy="40" r="8" />
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
  const dots: [number, number][] = []
  for (let x = 40; x < 800; x += 60) {
    for (let y = 40; y < 400; y += 60) {
      dots.push([x, y])
    }
  }

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#818cf8" opacity={opacity}>
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
        ))}
      </g>
      <g fill="none" stroke="#818cf8" strokeWidth="1.5" opacity={opacity * 0.8}>
        <path d="M100,40 L100,160 L220,160" />
        <path d="M400,100 L400,220 L520,220 L520,340" />
        <path d="M640,40 L640,100 L760,100" />
        <path d="M160,280 L280,280 L280,340" />
        <path d="M340,40 L340,100 L460,100 L460,160" />
        <path d="M700,220 L700,340" />
        <rect x="94" y="154" width="12" height="12" rx="2" />
        <rect x="394" y="214" width="12" height="12" rx="2" />
        <rect x="514" y="334" width="12" height="12" rx="2" />
        <rect x="334" y="94" width="12" height="12" rx="2" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// General News — halftone / scattered dots
// ---------------------------------------------------------------------------

export function GeneralNewsPattern({ className = '', opacity = 0.18 }: PatternProps) {
  // Deterministic pseudo-random scatter using simple hash
  const dots: { cx: number; cy: number; r: number }[] = []
  for (let i = 0; i < 80; i++) {
    const seed = (i * 7919 + 104729) % 100000
    dots.push({
      cx: (seed % 800),
      cy: Math.floor(seed / 800) % 400,
      r: 3 + (i % 4) * 2,
    })
  }

  return (
    <svg
      aria-hidden="true"
      className={`${base} ${className}`}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#f472b6" opacity={opacity}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} />
        ))}
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
  'general-news': GeneralNewsPattern,
}

/**
 * Returns the SVG pattern component for a given issue slug.
 * Falls back to GeneralNewsPattern for unknown slugs.
 */
export function getCategoryPattern(issueSlug: string): React.ComponentType<PatternProps> {
  return PATTERN_MAP[issueSlug] ?? GeneralNewsPattern
}
