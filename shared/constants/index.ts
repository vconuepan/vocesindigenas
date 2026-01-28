import type { StoryStatus, EmotionTag, JobName } from '../types/index.js'

export const STORY_STATUSES: StoryStatus[] = [
  'fetched',
  'pre_analyzed',
  'analyzed',
  'selected',
  'published',
  'rejected',
  'trashed',
]

export const EMOTION_TAGS: EmotionTag[] = [
  'uplifting',
  'surprising',
  'frustrating',
  'scary',
  'calm',
]

export const JOB_NAMES: JobName[] = [
  'crawl_feeds',
  'preassess_stories',
  'assess_stories',
  'select_stories',
]

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
