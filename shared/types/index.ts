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
  issueId: string | null
  status: StoryStatus
  dateCrawled: string
  datePublished: string | null
  relevancePre: number | null
  relevance: number | null
  emotionTag: EmotionTag | null
  slug: string | null
  title: string | null
  titleLabel: string | null
  summary: string | null
  quote: string | null
  quoteAttribution: string | null
  marketingBlurb: string | null
  relevanceReasons: string | null
  relevanceSummary: string | null
  antifactors: string | null
  relevanceCalculation: string | null
  crawlMethod: string | null
  createdAt: string
  updatedAt: string
  issue?: { id: string; name: string; slug: string; parentId?: string | null; parent?: { id: string; name: string; slug: string } | null } | null
  feed?: {
    title: string
    displayTitle?: string | null
    issue?: {
      id?: string
      name: string
      slug: string
      parentId?: string | null
      parent?: { id: string; name: string; slug: string } | null
    }
  }
}

export interface PublicStory extends Story {
  feed: {
    id: string
    title: string
    displayTitle: string | null
    issue: {
      name: string
      slug: string
    }
  }
}

export interface Feed {
  id: string
  title: string
  rssUrl: string
  url: string | null
  displayTitle: string | null
  language: string
  issueId: string
  active: boolean
  crawlIntervalHours: number
  lastCrawledAt: string | null
  lastCrawlError: string | null
  lastCrawlErrorAt: string | null
  consecutiveFailedCrawls: number
  consecutiveEmptyCrawls: number
  lastSuccessfulCrawlAt: string | null
  lastEtag: string | null
  lastModified: string | null
  lastCrawlResult: string | null
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
  errorMessage?: string
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
  html: string
  storyIds: string[]
  selectedStoryIds: string[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export type NewsletterSendStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'

export interface NewsletterSend {
  id: string
  newsletterId: string
  plunkCampaignId: string | null
  isTest: boolean
  status: NewsletterSendStatus
  htmlContent: string
  stats: Record<string, unknown>
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PendingSubscription {
  id: string
  email: string
  token: string
  plunkContactId: string | null
  confirmedAt: string | null
  expiresAt: string
  createdAt: string
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
  running: boolean
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
  rating?: string
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

// --- Background task types ---

export type BulkTaskType = 'preassess' | 'assess' | 'select' | 'reclassify' | 'emotion'
export type BulkTaskStatus = 'running' | 'completed' | 'failed'

export interface TaskState {
  id: string
  type: BulkTaskType
  status: BulkTaskStatus
  total: number
  completed: number
  failed: number
  errors: string[]
  storyIds: string[]
  createdAt: string
  completedAt?: string
}
