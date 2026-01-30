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

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type JobName =
  | 'crawl_feeds'
  | 'preassess_stories'
  | 'assess_stories'
  | 'select_stories'
  | 'publish_stories'

export type JobStatus = 'idle' | 'running' | 'failed'

// --- API response types ---

export interface Story {
  id: string
  sourceUrl: string
  sourceTitle: string
  sourceContent: string
  sourceDatePublished: string | null
  feedId: string
  status: StoryStatus
  dateCrawled: string
  datePublished: string | null
  relevancePre: number | null
  relevance: number | null
  emotionTag: EmotionTag | null
  slug: string | null
  title: string | null
  summary: string | null
  quote: string | null
  marketingBlurb: string | null
  relevanceReasons: string | null
  antifactors: string | null
  relevanceCalculation: string | null
  crawlMethod: string | null
  createdAt: string
  updatedAt: string
  feed?: {
    title: string
    issue?: {
      name: string
      slug: string
    }
  }
}

export interface PublicStory extends Story {
  feed: {
    title: string
    issue: {
      name: string
      slug: string
    }
  }
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

export interface CrawlResult {
  feedId: string
  feedTitle: string
  newStories: number
  skipped: number
  errors: number
}

export interface Issue {
  id: string
  name: string
  slug: string
  description: string
  promptFactors: string
  promptAntifactors: string
  promptRatings: string
  parentId: string | null
  parent?: { id: string; name: string; slug: string } | null
  children?: Issue[]
  intro: string
  evaluationIntro: string
  evaluationCriteria: string[]
  sourceNames: string[]
  makeADifference: { label: string; url: string }[]
  publishedStoryCount?: number
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
  status?: StoryStatus | 'all'
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
