interface RatingDisplayProps {
  low: number | null
  high?: number | null
  className?: string
}

function ratingColor(rating: number): string {
  if (rating >= 8) return 'text-green-700'
  if (rating >= 6) return 'text-yellow-700'
  if (rating >= 4) return 'text-orange-600'
  return 'text-neutral-500'
}

export default function RatingDisplay({ low, high, className = '' }: RatingDisplayProps) {
  if (low === null) return null

  return (
    <span className={`font-medium ${ratingColor(low)} ${className}`} title="Relevance rating">
      {low}/10
      {high !== null && high !== undefined && high !== low && (
        <span className="text-neutral-400 text-sm"> – {high}/10</span>
      )}
    </span>
  )
}
