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
  surprising: 'purple',
  frustrating: 'orange',
  scary: 'red',
  calm: 'blue',
}

export const JOB_DISPLAY_NAMES: Record<JobName, string> = {
  crawl_feeds: 'Crawl Feeds',
  preassess_stories: 'Pre-assess Stories',
  assess_stories: 'Assess Stories',
  select_stories: 'Select Stories',
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

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
