import type { StoryStatus, EmotionTag, JobName } from '@shared/types'

export type BadgeVariant = 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'pink' | 'orange'

export const STATUS_VARIANTS: Record<StoryStatus, BadgeVariant> = {
  fetched: 'gray',
  pre_analyzed: 'blue',
  analyzed: 'yellow',
  selected: 'purple',
  published: 'green',
  rejected: 'red',
  trashed: 'orange',
}

export const EMOTION_VARIANTS: Record<EmotionTag, BadgeVariant> = {
  uplifting: 'green',
  frustrating: 'orange',
  scary: 'red',
  calm: 'blue',
}

export const JOB_DISPLAY_NAMES: Record<JobName, string> = {
  crawl_feeds: 'Crawl Feeds',
  preassess_stories: 'Pre-assess Stories',
  assess_stories: 'Assess Stories',
  select_stories: 'Select Stories',
  publish_stories: 'Publish Stories',
  bluesky_auto_post: 'Bluesky Auto-Post',
  bluesky_update_metrics: 'Bluesky Update Metrics',
}

/** Pipeline execution order for sorting jobs in the UI. */
export const JOB_PIPELINE_ORDER: JobName[] = [
  'crawl_feeds',
  'preassess_stories',
  'assess_stories',
  'select_stories',
  'publish_stories',
  'bluesky_auto_post',
  'bluesky_update_metrics',
]

const STATUS_LABELS: Partial<Record<string, string>> = {
  pre_analyzed: 'Pre',
}

export function formatStatus(status: string): string {
  if (STATUS_LABELS[status]) return STATUS_LABELS[status]
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const currentYear = new Date().getFullYear()

/** Date only, no time. Omits year if current year. */
export function formatShortDate(dateStr: string | null, timeZone = 'UTC'): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone }
  if (date.getFullYear() !== currentYear) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

/** Date with time. Omits year if current year. */
export function formatDateWithTime(dateStr: string | null, timeZone = 'UTC'): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }
  if (date.getFullYear() !== currentYear) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

/** Full date with time and year. For edit views. */
export function formatDate(dateStr: string | null, timeZone = 'UTC'): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

/** Relative time string, e.g. "5m ago", "2h ago", "3d ago". */
export function formatRelativeTime(dateStr: string | null, timeZone = 'UTC'): string {
  if (!dateStr) return '—'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })
}
