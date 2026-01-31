export const config = {
  llm: {
    models: {
      small: {
        name: process.env.OPENAI_MODEL_SMALL || 'gpt-5-mini',
        reasoningEffort: 'medium' as const,
      },
      medium: {
        name: process.env.OPENAI_MODEL_MEDIUM || 'gpt-5-mini',
        reasoningEffort: 'medium' as const,
      },
      large: {
        name: process.env.OPENAI_MODEL_LARGE || 'gpt-5.2',
        reasoningEffort: 'medium' as const,
      },
    },
    delayMs: parseInt(process.env.LLM_DELAY_MS || '500', 10),
    preassessBatchSize: 10,
    preassessContentMaxLength: 1200,
    assessContentMaxLength: 4000,
    fullAssessmentThreshold: 4,
  },
  selection: {
    maxGroupSize: parseInt(process.env.SELECT_MAX_GROUP_SIZE || '20', 10),
    ratio: parseFloat(process.env.SELECT_RATIO || '0.5'),
    relevanceMin: parseInt(process.env.SELECT_RELEVANCE_MIN || '5', 10),
  },
  crawl: {
    rssItemLimit: parseInt(process.env.RSS_ITEM_LIMIT || '20', 10),
    httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '10000', 10),
    minContentLength: parseInt(process.env.MIN_CONTENT_LENGTH || '50', 10),
  },
  content: {
    storyAssignmentDays: parseInt(process.env.STORY_ASSIGNMENT_DAYS || '7', 10),
  },
  feed: {
    size: parseInt(process.env.RSS_FEED_SIZE || '50', 10),
    cacheMaxAge: parseInt(process.env.RSS_CACHE_MAX_AGE || '900', 10),
  },
  rateLimit: {
    publicWindowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || String(15 * 60 * 1000), 10),
    publicMax: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '100', 10),
    expensiveWindowMs: parseInt(process.env.RATE_LIMIT_EXPENSIVE_WINDOW_MS || String(60 * 60 * 1000), 10),
    expensiveMax: parseInt(process.env.RATE_LIMIT_EXPENSIVE_MAX || '1000', 10),
  },
  concurrency: {
    preassess: parseInt(process.env.CONCURRENCY_PREASSESS || '10', 10),
    assess: parseInt(process.env.CONCURRENCY_ASSESS || '10', 10),
    select: parseInt(process.env.CONCURRENCY_SELECT || '10', 10),
    crawlFeeds: parseInt(process.env.CONCURRENCY_CRAWL_FEEDS || '5', 10),
    crawlArticles: parseInt(process.env.CONCURRENCY_CRAWL_ARTICLES || '3', 10),
  },
} as const
