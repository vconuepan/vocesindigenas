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
}

/** Pipeline execution order for sorting jobs in the UI. */
export const JOB_PIPELINE_ORDER: JobName[] = [
  'crawl_feeds',
  'preassess_stories',
  'assess_stories',
  'select_stories',
  'publish_stories',
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
export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (date.getFullYear() !== currentYear) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

/** Date with time. Omits year if current year. */
export function formatDateWithTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  if (date.getFullYear() !== currentYear) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

/** Full date with time and year. For edit views. */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
