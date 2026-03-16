import { useState } from 'react'
import { usePositivity } from '../contexts/PositivityContext'

const LABELS: Record<number, string> = {
  0: 'Solo noticias pesadas',
  25: 'Mayormente pesadas',
  50: 'Mezcla equilibrada',
  75: 'Mayormente positivas',
  100: 'Solo noticias positivas',
}

const TOOLTIP = 'Filtra las noticias según su tono emocional: de más impactantes a más esperanzadoras'

export function MoodDialPanel({ className }: { className?: string }) {
  const { positivity, setPositivity } = usePositivity()
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ''}`}>
      {/* Label con tooltip */}
      <div className="relative flex items-center gap-1">
        <span className="text-[10px] text-neutral-500 leading-none select-none">
          Peso emocional
        </span>
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-[10px] text-neutral-400 hover:text-neutral-600 leading-none focus:outline-none"
          aria-label="¿Qué es el peso emocional?"
        >
          ⓘ
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-neutral-800 text-white text-[11px] rounded-lg px-3 py-2 shadow-lg z-50 leading-relaxed text-center">
            {TOOLTIP}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
          </div>
        )}
      </div>

      {/* Slider */}
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

      {/* Label del valor actual */}
      <span className="text-[10px] text-neutral-400 leading-none select-none">
        {LABELS[positivity] ?? 'Mezcla equilibrada'}
      </span>
    </div>
  )
}
