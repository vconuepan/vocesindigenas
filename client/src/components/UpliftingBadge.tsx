/**
 * Small pill badge shown on stories with emotionTag === 'uplifting'.
 * Displays a sun icon and "Uplifting" label in warm amber tones.
 */

interface UpliftingBadgeProps {
  size?: 'sm' | 'xs'
  /** Hex color to tint the badge. Defaults to amber. */
  color?: string
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="3" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function UpliftingBadge({ size = 'sm', color }: UpliftingBadgeProps) {
  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-0.5 gap-1'
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'

  // Use issue color when provided, otherwise fall back to amber
  const style = color
    ? { backgroundColor: `${color}18`, color } as React.CSSProperties
    : undefined
  const className = color
    ? `inline-flex items-center ${sizeClasses} rounded-full font-medium`
    : `inline-flex items-center ${sizeClasses} rounded-full bg-amber-100 text-amber-700 font-medium`

  return (
    <span className={className} style={style} title="Uplifting story">
      <SunIcon className={iconSize} />
      Uplifting
    </span>
  )
}
