import { usePositivity } from '../contexts/PositivityContext'

const LABELS: Record<number, string> = {
  0: 'Only heavy news',
  25: 'Mostly heavy',
  50: 'Balanced mix',
  75: 'Mostly uplifting',
  100: 'Only uplifting',
}

/**
 * Compact Mood Dial — "Emotional weight" label above emoji slider.
 * Used directly in both mobile menu and desktop header.
 */
export function MoodDialPanel({ className }: { className?: string }) {
  const { positivity, setPositivity } = usePositivity()

  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ''}`}>
      <span className="text-[10px] text-neutral-500 leading-none select-none">
        Emotional weight
      </span>

      <div className="flex items-center gap-2">
        <span className="text-sm select-none shrink-0 leading-none" aria-hidden="true">
          😰
        </span>

        <input
          type="range"
          min={0}
          max={100}
          step={25}
          value={positivity}
          onChange={(e) => setPositivity(parseInt(e.target.value, 10))}
          className="positivity-slider w-40 lg:w-32 h-2 appearance-none bg-neutral-200 rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          aria-label={`Mood Dial: ${LABELS[positivity] ?? 'Balanced mix'}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={positivity}
          aria-valuetext={LABELS[positivity] ?? 'Balanced mix'}
        />

        <span className="text-sm select-none shrink-0 leading-none" aria-hidden="true">
          😊
        </span>
      </div>
    </div>
  )
}
