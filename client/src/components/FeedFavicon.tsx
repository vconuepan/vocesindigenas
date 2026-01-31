import { useState } from 'react'

interface FeedFaviconProps {
  feedId: string
  size?: number
  className?: string
}

/**
 * Public feed favicon — hides itself if the image is missing.
 * Used in story cards and story pages.
 */
export default function FeedFavicon({ feedId, size = 16, className = '' }: FeedFaviconProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <img
      src={`/images/feeds/${feedId}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`inline-block rounded-sm ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Admin feed favicon — shows a neutral placeholder if the image is missing.
 * Used in feed table and edit panel. Supports cache-busting via imgKey.
 */
export function FeedFaviconPreview({ feedId, imgKey = 0, size = 20 }: { feedId: string; imgKey?: number; size?: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className="inline-block rounded-sm bg-neutral-100 border border-neutral-200"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      key={imgKey}
      src={`/images/feeds/${feedId}.png${imgKey ? `?t=${imgKey}` : ''}`}
      alt=""
      width={size}
      height={size}
      className="inline-block rounded-sm bg-neutral-100"
      onError={() => setFailed(true)}
    />
  )
}
