/**
 * Single continuous-stroke SVG illustrations for each issue category.
 * Used as large decorative elements in section dividers on the homepage.
 *
 * Each illustration uses smooth cubic bezier curves with a consistent
 * stroke weight. Strokes have a natural lead-in and trail-off —
 * the line begins slightly before and ends slightly past the shape,
 * like a confident pen stroke.
 *
 * These are rendered large and positioned absolutely so they extend
 * beyond the heading into the content area and left margin.
 */

import type { ComponentType } from 'react'

export interface IllustrationProps {
  /** Hex color for the stroke */
  color: string
  className?: string
  /** Icon size in px. Default 200 */
  size?: number
}

const strokeProps = {
  fill: 'none',
  strokeWidth: 4.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// ---------------------------------------------------------------------------
// Human Development — linked chain of people
// ---------------------------------------------------------------------------

export function HumanDevelopmentIllustration({ color, className = '', size = 200 }: IllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Two linked figures holding hands */}
      {/* Left figure — head */}
      <circle cx="18" cy="16" r="5" stroke={color} {...strokeProps} />
      {/* Left figure — body */}
      <path d="M 18 21 L 18 36" stroke={color} {...strokeProps} />
      {/* Left figure — legs */}
      <path d="M 18 36 L 12 50" stroke={color} {...strokeProps} />
      <path d="M 18 36 L 24 50" stroke={color} {...strokeProps} />
      {/* Left figure — outer arm */}
      <path d="M 18 27 L 8 32" stroke={color} {...strokeProps} />
      {/* Linked arms — meeting in the middle */}
      <path d="M 18 27 L 32 24 L 46 27" stroke={color} {...strokeProps} />

      {/* Right figure — head */}
      <circle cx="46" cy="16" r="5" stroke={color} {...strokeProps} />
      {/* Right figure — body */}
      <path d="M 46 21 L 46 36" stroke={color} {...strokeProps} />
      {/* Right figure — legs */}
      <path d="M 46 36 L 40 50" stroke={color} {...strokeProps} />
      <path d="M 46 36 L 52 50" stroke={color} {...strokeProps} />
      {/* Right figure — outer arm */}
      <path d="M 46 27 L 56 32" stroke={color} {...strokeProps} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Planet & Climate — Earth globe with abstract continents
// ---------------------------------------------------------------------------

export function PlanetClimateIllustration({ color, className = '', size = 200 }: IllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Globe outline */}
      <circle cx="32" cy="32" r="26" stroke={color} {...strokeProps} />
      {/* Upper landmass — irregular continent blob */}
      <path
        d="M 18 20 C 20 16 26 15 30 17 C 34 19 40 16 44 19 C 48 22 46 28 42 28 C 38 28 34 24 28 26 C 22 28 16 24 18 20 Z"
        stroke={color}
        {...strokeProps}
      />
      {/* Lower landmass — smaller blob, offset right */}
      <path
        d="M 30 38 C 34 36 40 36 44 39 C 47 42 44 46 40 47 C 36 48 30 46 28 43 C 26 40 28 38 30 38 Z"
        stroke={color}
        {...strokeProps}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Existential Threats — shield
// ---------------------------------------------------------------------------

export function ExistentialThreatsIllustration({ color, className = '', size = 200 }: IllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={[
          'M 8 20',
          'C 10 19 14 17 20 14',
          'C 24 12 28 10 32 8',
          'C 36 10 40 12 44 14',
          'C 50 17 54 19 56 20',
          'C 54 22 52 28 52 34',
          'C 52 44 44 52 32 58',
          'C 20 52 12 44 12 34',
          'C 12 28 10 22 8 20',
        ].join(' ')}
        stroke={color}
        {...strokeProps}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Science & Technology — atom (nucleus + two orbits)
// ---------------------------------------------------------------------------

export function ScienceTechnologyIllustration({ color, className = '', size = 200 }: IllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Nucleus dot */}
      <circle cx="32" cy="32" r="3" stroke={color} {...strokeProps} />
      {/* Orbit 1: horizontal ellipse */}
      <ellipse cx="32" cy="32" rx="26" ry="10" stroke={color} {...strokeProps} />
      {/* Orbit 2: tilted 60° */}
      <ellipse
        cx="32" cy="32" rx="26" ry="10"
        transform="rotate(60 32 32)"
        stroke={color}
        {...strokeProps}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// General News — signal waves (concentric arcs)
// ---------------------------------------------------------------------------

export function GeneralNewsIllustration({ color, className = '', size = 200 }: IllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wave 1 — smallest */}
      <path
        d="M 18 52 C 24 46 24 36 18 30"
        stroke={color}
        {...strokeProps}
      />
      {/* Wave 2 — medium */}
      <path
        d="M 26 58 C 36 48 36 30 26 20"
        stroke={color}
        {...strokeProps}
      />
      {/* Wave 3 — largest, trails off */}
      <path
        d="M 34 64 C 48 52 50 24 34 10"
        stroke={color}
        {...strokeProps}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

const ILLUSTRATION_MAP: Record<string, ComponentType<IllustrationProps>> = {
  'human-development': HumanDevelopmentIllustration,
  'planet-climate': PlanetClimateIllustration,
  'existential-threats': ExistentialThreatsIllustration,
  'science-technology': ScienceTechnologyIllustration,
  'general-news': GeneralNewsIllustration,
}

/**
 * Returns the SVG illustration component for a given issue slug.
 * Falls back to GeneralNewsIllustration for unknown slugs.
 */
export function getCategoryIllustration(issueSlug: string): ComponentType<IllustrationProps> {
  return ILLUSTRATION_MAP[issueSlug] ?? GeneralNewsIllustration
}
