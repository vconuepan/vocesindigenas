import { useState, useEffect } from 'react'
import { isSaved, toggleSaved } from '../lib/preferences'

interface BookmarkButtonProps {
  slug: string
  size?: 'sm' | 'md'
  className?: string
}

export default function BookmarkButton({ slug, size = 'sm', className = '' }: BookmarkButtonProps) {
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
  const padding = size === 'md' ? 'p-1.5' : 'p-1'

  return (
    <button
      onClick={handleToggle}
      className={`${padding} rounded transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
        saved
          ? 'text-brand-600 hover:text-brand-700'
          : 'text-neutral-300 hover:text-neutral-500'
      } ${className}`}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark story'}
      title={saved ? 'Remove bookmark' : 'Bookmark'}
    >
      <svg className={iconSize} viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  )
}
