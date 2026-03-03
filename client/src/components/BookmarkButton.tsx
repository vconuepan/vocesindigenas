import { useState, useEffect } from 'react'
import { isSaved, toggleSaved } from '../lib/preferences'

interface BookmarkButtonProps {
  slug: string
  size?: 'sm' | 'md'
  /** On desktop (lg+): show only on hover unless bookmarked. On mobile/tablet: always visible. */
  hoverReveal?: boolean
  className?: string
}

export default function BookmarkButton({ slug, size = 'sm', hoverReveal = false, className = '' }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(isSaved(slug))
  }, [slug])

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const nowSaved = toggleSaved(slug)
    setSaved(nowSaved)
    // Notify SavedPage and other components
    window.dispatchEvent(new Event('ar-saved-changed'))
  }

  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  // Asymmetric vertical padding: less on top so icon aligns with title label text
  const padding = size === 'md' ? 'pt-0.5 pb-2.5 px-1.5' : 'pt-0 pb-2 px-1'

  // When hoverReveal: desktop-only hover reveal unless bookmarked (saved items always visible)
  const visibilityClass = hoverReveal && !saved
    ? 'lg:opacity-0 lg:group-hover:opacity-100 transition-opacity'
    : 'transition-opacity'

  return (
    <button
      onClick={handleToggle}
      className={`${padding} rounded transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
        saved
          ? 'text-brand-600 hover:text-brand-700'
          : 'text-neutral-300 hover:text-neutral-500'
      } ${visibilityClass} ${className}`}
      aria-label={saved ? 'Quitar marcador' : 'Guardar historia'}
title={saved ? 'Quitar marcador' : 'Guardar'}
    >
      <svg className={iconSize} viewBox="0 2 24 22" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  )
}
