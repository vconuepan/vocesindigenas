export const TEST_API_KEY = 'test-admin-key-12345'

export function authHeader() {
  return { Authorization: `Bearer ${TEST_API_KEY}` }
}

// Sample data factories

export function sampleIssue(overrides: Record<string, any> = {}) {
  return {
    id: 'issue-1',
    name: 'AI & Technology',
    slug: 'ai-technology',
    description: 'Test description',
    promptFactors: 'Test factors',
    promptAntifactors: 'Test antifactors',
    promptRatings: 'Test ratings',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function sampleFeed(overrides: Record<string, any> = {}) {
  return {
    id: 'feed-1',
    title: 'Test Feed',
    url: 'https://example.com/feed',
    language: 'en',
    issueId: 'issue-1',
    active: true,
    crawlIntervalHours: 24,
    lastCrawledAt: null,
    htmlSelector: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function sampleNewsletter(overrides: Record<string, any> = {}) {
  return {
    id: 'newsletter-1',
    title: 'Weekly Roundup #1',
    content: '',
    storyIds: [],
    status: 'draft' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function samplePodcast(overrides: Record<string, any> = {}) {
  return {
    id: 'podcast-1',
    title: 'Episode #1',
    script: '',
    storyIds: [],
    status: 'draft' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function sampleStory(overrides: Record<string, any> = {}) {
  return {
    id: 'story-1',
    url: 'https://example.com/article',
    title: 'Test Article',
    content: 'Test content',
    datePublished: null,
    dateCrawled: new Date('2024-01-01'),
    feedId: 'feed-1',
    status: 'fetched' as const,
    relevanceRatingLow: null,
    relevanceRatingHigh: null,
    emotionTag: null,
    aiResponse: null,
    aiSummary: null,
    aiQuote: null,
    aiKeywords: [],
    aiMarketingBlurb: null,
    aiRelevanceReasons: null,
    aiAntifactors: null,
    aiRelevanceCalculation: null,
    aiScenarios: null,
    crawlMethod: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}
