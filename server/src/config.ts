export const config = {
  llm: {
    models: {
      small: {
        name: process.env.OPENAI_MODEL_SMALL || "gpt-5-nano",
        reasoningEffort: "medium" as const,
      },
      medium: {
        name: process.env.OPENAI_MODEL_MEDIUM || "gpt-5-mini",
        reasoningEffort: "medium" as const,
      },
      large: {
        name: process.env.OPENAI_MODEL_LARGE || "gpt-5.2",
        reasoningEffort: "medium" as const,
      },
    },
    delayMs: parseInt(process.env.LLM_DELAY_MS || "500", 10),
  },
  preassess: {
    batchSize: 10,
    contentMaxLength: 1200,
  },
  assess: {
    contentMaxLength: 4000,
    fullAssessmentThreshold: 5,
  },
  selection: {
    maxGroupSize: parseInt(process.env.SELECT_MAX_GROUP_SIZE || "20", 10),
    ratio: parseFloat(process.env.SELECT_RATIO || "0.5"),
    relevanceMin: parseInt(process.env.SELECT_RELEVANCE_MIN || "5", 10),
  },
  crawl: {
    rssItemLimit: parseInt(process.env.RSS_ITEM_LIMIT || "30", 10),
    httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || "10000", 10),
    minContentLength: parseInt(process.env.MIN_CONTENT_LENGTH || "300", 10),
    staleAfterEmptyCrawls: parseInt(
      process.env.STALE_AFTER_EMPTY_CRAWLS || "5",
      10
    ),
    extractionApi: (process.env.EXTRACTION_API || "diffbot") as
      | "diffbot"
      | "pipfeed",
    diffbotTimeoutMs: parseInt(process.env.DIFFBOT_TIMEOUT_MS || "15000", 10),
    diffbotRateLimit: parseInt(process.env.DIFFBOT_RATE_LIMIT || "5", 10),
    pipfeedTimeoutMs: parseInt(process.env.PIPFEED_TIMEOUT_MS || "15000", 10),
    maxConcurrencyPerDomain: parseInt(
      process.env.MAX_CONCURRENCY_PER_DOMAIN || "2",
      10
    ),
    minDelayPerDomainMs: parseInt(
      process.env.MIN_DELAY_PER_DOMAIN_MS || "200",
      10
    ),
    localFailThreshold: parseInt(process.env.LOCAL_FAIL_THRESHOLD || "3", 10),
    totalFailThreshold: parseInt(process.env.TOTAL_FAIL_THRESHOLD || "3", 10),
  },
  content: {
    storyAssignmentDays: parseInt(process.env.STORY_ASSIGNMENT_DAYS || "7", 10),
  },
  newsletter: {
    storiesPerIssue: parseInt(
      process.env.NEWSLETTER_STORIES_PER_ISSUE || "2",
      10
    ),
  },
  feed: {
    size: parseInt(process.env.RSS_FEED_SIZE || "50", 10),
    cacheMaxAge: parseInt(process.env.RSS_CACHE_MAX_AGE || "900", 10),
  },
  rateLimit: {
    publicWindowMs: parseInt(
      process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || String(15 * 60 * 1000),
      10
    ),
    publicMax: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || "100", 10),
    expensiveWindowMs: parseInt(
      process.env.RATE_LIMIT_EXPENSIVE_WINDOW_MS || String(60 * 60 * 1000),
      10
    ),
    expensiveMax: parseInt(process.env.RATE_LIMIT_EXPENSIVE_MAX || "1000", 10),
  },
  concurrency: {
    preassess: parseInt(process.env.CONCURRENCY_PREASSESS || "10", 10),
    assess: parseInt(process.env.CONCURRENCY_ASSESS || "10", 10),
    select: parseInt(process.env.CONCURRENCY_SELECT || "10", 10),
    reclassify: parseInt(process.env.CONCURRENCY_RECLASSIFY || "10", 10),
    crawlFeeds: parseInt(process.env.CONCURRENCY_CRAWL_FEEDS || "5", 10),
    crawlArticles: parseInt(process.env.CONCURRENCY_CRAWL_ARTICLES || "3", 10),
  },
  plunk: {
    secretKey: process.env.PLUNK_SECRET_KEY || "",
    publicKey: process.env.PLUNK_PUBLIC_KEY || "",
    fromEmail: process.env.PLUNK_FROM_EMAIL || "",
    fromName: process.env.PLUNK_FROM_NAME || "Actually Relevant",
    testSegmentId: process.env.PLUNK_TEST_SEGMENT_ID || "",

    baseUrl: "https://next-api.useplunk.com",
  },
  subscribe: {
    confirmTokenExpiryHours: parseInt(
      process.env.SUBSCRIBE_TOKEN_EXPIRY_HOURS || "24",
      10
    ),
    rateLimitWindowMs: parseInt(
      process.env.SUBSCRIBE_RATE_LIMIT_WINDOW_MS || String(60 * 1000),
      10
    ),
    rateLimitMax: parseInt(process.env.SUBSCRIBE_RATE_LIMIT_MAX || "3", 10),
  },
} as const;
