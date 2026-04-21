/**
 * SpotlightBand — "En Foco" rotating headline band.
 *
 * Sits between the hero and the issue feed on the homepage.
 * Shows the active spotlight label + up to 8 matching story headlines,
 * cycling through them with a smooth fade every 5 seconds.
 *
 * Renders nothing when there is no active spotlight or no matching stories.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../lib/api'
import type { SpotlightStory } from '../lib/api'
import { getCategoryColor } from '../lib/category-colors'

const ROTATION_INTERVAL = 5000 // ms between story transitions

export default function SpotlightBand() {
  const { data, isLoading } = useQuery({
    queryKey: ['spotlight'],
    queryFn: () => publicApi.spotlight(),
    staleTime: 2 * 60 * 1000,
  })

  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stories: SpotlightStory[] = data?.stories ?? []
  const total = stories.length

  // Reset index when stories change
  useEffect(() => {
    setActiveIdx(0)
    setVisible(true)
  }, [data?.spotlight?.id])

  // Auto-rotate with fade
  useEffect(() => {
    if (total <= 1) return

    timerRef.current = setInterval(() => {
      // Fade out
      setVisible(false)
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % total)
        setVisible(true)
      }, 350) // match CSS transition
    }, ROTATION_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [total, data?.spotlight?.id])

  // Manual dot navigation
  function goTo(idx: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setVisible(false)
    setTimeout(() => {
      setActiveIdx(idx)
      setVisible(true)
    }, 200)
  }

  if (isLoading || !data || total === 0) return null

  const { spotlight } = data
  const story = stories[activeIdx]
  const issueColor = story.issue ? getCategoryColor(story.issue.slug) : null

  return (
    <div
      className="w-full bg-neutral-900 border-b border-neutral-700/50"
      role="region"
      aria-label={`En Foco: ${spotlight.label}`}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-start gap-3 md:gap-4 min-h-[3rem]">
          {/* Label pill — fixed width so headline doesn't jump */}
          <div className="shrink-0 pt-0.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-400 whitespace-nowrap">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#4ade80' }}
                aria-hidden="true"
              />
              En Foco
            </span>
            <p className="text-xs text-neutral-400 font-medium mt-0.5 leading-tight max-w-[130px] md:max-w-none">
              {spotlight.label}
            </p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-neutral-700 shrink-0 mt-0.5" aria-hidden="true" />

          {/* Rotating headline */}
          <div className="flex-1 min-w-0">
            <div
              className="transition-opacity duration-300"
              style={{ opacity: visible ? 1 : 0 }}
              aria-live="polite"
              aria-atomic="true"
            >
              {story.issue && (
                <span
                  className="block text-[10px] font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: issueColor?.hex ?? '#a1a1aa' }}
                >
                  {story.issue.name}
                </span>
              )}
              {story.slug ? (
                <Link
                  to={`/stories/${story.slug}`}
                  className="block text-sm md:text-base font-semibold text-white leading-snug hover:text-brand-200 transition-colors line-clamp-2"
                >
                  {story.title}
                </Link>
              ) : (
                <p className="text-sm md:text-base font-semibold text-white leading-snug line-clamp-2">
                  {story.title}
                </p>
              )}
            </div>
          </div>

          {/* Dot navigation */}
          {total > 1 && (
            <div className="shrink-0 flex items-center gap-1.5 pt-1 self-start">
              {stories.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  aria-label={`Ver titular ${idx + 1} de ${total}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    idx === activeIdx
                      ? 'bg-brand-400 scale-125'
                      : 'bg-neutral-600 hover:bg-neutral-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
