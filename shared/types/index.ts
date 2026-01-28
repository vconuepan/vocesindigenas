// Story pipeline statuses
export type StoryStatus =
  | 'fetched'
  | 'pre_analyzed'
  | 'analyzed'
  | 'selected'
  | 'published'
  | 'rejected'
  | 'trashed'

export type EmotionTag =
  | 'uplifting'
  | 'surprising'
  | 'frustrating'
  | 'scary'
  | 'calm'

export type UserRole = 'admin' | 'editor' | 'viewer'

export type JobName =
  | 'crawl_feeds'
  | 'preassess_stories'
  | 'assess_stories'
  | 'select_stories'

export type JobStatus = 'idle' | 'running' | 'failed'

// --- API response types ---

export interface Story {
  id: string
  url: string
  title: string
  content: string
  datePublished: string | null
  dateCrawled: string
  feedId: string
  status: StoryStatus
  relevanceRatingLow: number | null
  relevanceRatingHigh: number | null
  emotionTag: EmotionTag | null
  aiSummary: string | null
  aiQuote: string | null
  aiKeywords: string[] | null
  aiMarketingBlurb: string | null
  aiRelevanceReasons: string | null
  aiAntifactors: string | null
  aiRelevanceCalculation: string | null
  aiScenarios: string | null
  crawlMethod: string | null
  createdAt: string
  updatedAt: string
}

export interface Feed {
  id: string
  title: string
  url: string
  language: string
  issueId: string
  active: boolean
  crawlIntervalHours: number
  lastCrawledAt: string | null
  htmlSelector: string | null
  createdAt: string
  updatedAt: string
}

export interface Issue {
  id: string
  name: string
  slug: string
  description: string
  promptFactors: string
  promptAntifactors: string
  promptRatings: string
  createdAt: string
  updatedAt: string
}

export interface Newsletter {
  id: string
  title: string
  content: string
  storyIds: string[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface Podcast {
  id: string
  title: string
  script: string
  storyIds: string[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface JobRun {
  id: string
  jobName: JobName
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastError: string | null
  enabled: boolean
  cronExpression: string
  createdAt: string
  updatedAt: string
}

// --- Query/filter types ---

export interface StoryFilters {
  status?: StoryStatus
  issueId?: string
  feedId?: string
  crawledAfter?: string
  crawledBefore?: string
  ratingMin?: number
  ratingMax?: number
  emotionTag?: EmotionTag
  sort?: StorySort
  page?: number
  pageSize?: number
}

export type StorySort =
  | 'rating_asc'
  | 'rating_desc'
  | 'date_asc'
  | 'date_desc'
  | 'title_asc'
  | 'title_desc'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
