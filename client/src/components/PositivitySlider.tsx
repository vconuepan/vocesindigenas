import { usePositivity } from '../contexts/PositivityContext'
const LABELS: Record<number, string> = {
  0: 'Solo noticias pesadas',
  25: 'Mayormente pesadas',
  50: 'Mezcla equilibrada',
  75: 'Mayormente positivas',
  100: 'Solo noticias positivas',
}
/**
 * Compact Mood Dial — "Peso emocional" label above emoji slider.
 * Used directly in both mobile menu and desktop header.
 */
export function MoodDialPanel({ className }: { className?: string }) {
  const { positivity, setPositivity } = usePositivity()
  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ''}`}>
      <span className="text-[10px] text-neutral-500 leading-none select-none">
        Peso emocional
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
          aria-label={`Filtro emocional: ${LABELS[positivity] ?? 'Mezcla equilibrada'}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={positivity}
          aria-valuetext={LABELS[positivity] ?? 'Mezcla equilibrada'}
        />
        <span className="text-sm select-none shrink-0 leading-none" aria-hidden="true">
          😊
        </span>
      </div>
    </div>
  )
}
