import type { EmotionTag } from '@shared/types'

const EMOTION_STYLES: Record<EmotionTag, string> = {
  uplifting: 'bg-green-100 text-green-800',
  surprising: 'bg-purple-100 text-purple-800',
  frustrating: 'bg-orange-100 text-orange-800',
  scary: 'bg-red-100 text-red-800',
  calm: 'bg-blue-100 text-blue-800',
}

const EMOTION_LABELS: Record<EmotionTag, string> = {
  uplifting: 'Uplifting',
  surprising: 'Surprising',
  frustrating: 'Frustrating',
  scary: 'Scary',
  calm: 'Calm',
}

interface EmotionBadgeProps {
  emotion: EmotionTag
  className?: string
}

export default function EmotionBadge({ emotion, className = '' }: EmotionBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${EMOTION_STYLES[emotion]} ${className}`}
    >
      {EMOTION_LABELS[emotion]}
    </span>
  )
}
