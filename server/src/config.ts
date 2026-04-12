export const config = {
  /** Canonical public URL for the site — used in social media posts, RSS feeds, sitemaps, etc. */
  siteUrl: process.env.SITE_URL || 'https://impactoindigena.news',
  llm: {
    models: {
      small: {
        name: process.env.OPENAI_MODEL_SMALL || "gpt-5.4-mini",
        reasoningEffort: "medium" as const,
      },
      medium: {
        name: process.env.OPENAI_MODEL_MEDIUM || "gpt-5.4-mini",
        reasoningEffort: "medium" as const,
      },
      large: {
        name: process.env.OPENAI_MODEL_LARGE || "gpt-5.4",
        reasoningEffort: "medium" as const,
      },
    },
    delayMs: parseInt(process.env.LLM_DELAY_MS || "500", 10),
  },
  preassess: {
    batchSize: 10,
    contentMaxLength: 1200,
    modelTier: "medium" as const,
  },
  assess: {
    contentMaxLength: 4000,
    fullAssessmentThreshold: 4,
    modelTier: "medium" as const,
  },
  selection: {
    maxGroupSize: parseInt(process.env.SELECT_MAX_GROUP_SIZE || "20", 10),
    ratio: parseFloat(process.env.SELECT_RATIO || "0.5"),
    relevanceMin: parseInt(process.env.SELECT_RELEVANCE_MIN || "3", 10),
    modelTier: "large" as const,
  },
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    // Changing dimensions requires a DB migration to alter the vector(1536) column and rebuild the index
    dimensions: 1536,
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
    concurrency: parseInt(process.env.EMBEDDING_CONCURRENCY || '5', 10),
    delayMs: parseInt(process.env.EMBEDDING_DELAY_MS || '100', 10),
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
    selectModelTier: "large" as const,
    contentModelTier: "large" as const,
  },
  feed: {
    size: parseInt(process.env.RSS_FEED_SIZE || "50", 10),
    cacheMaxAge: parseInt(process.env.RSS_CACHE_MAX_AGE || "900", 10),
  },
  sitemap: {
    cacheMaxAge: parseInt(process.env.SITEMAP_CACHE_MAX_AGE || "3600", 10),
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
    searchWindowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || String(15 * 60 * 1000), 10),
    searchMax: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || "20", 10),
  },
  concurrency: {
    preassess: parseInt(process.env.CONCURRENCY_PREASSESS || "10", 10),
    assess: parseInt(process.env.CONCURRENCY_ASSESS || "10", 10),
    select: parseInt(process.env.CONCURRENCY_SELECT || "10", 10),
    reclassify: parseInt(process.env.CONCURRENCY_RECLASSIFY || "10", 10),
    crawlFeeds: parseInt(process.env.CONCURRENCY_CRAWL_FEEDS || "3", 10),
    crawlArticles: parseInt(process.env.CONCURRENCY_CRAWL_ARTICLES || "3", 10),
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
    fromEmail: process.env.BREVO_FROM_EMAIL || "",
    fromName: process.env.BREVO_FROM_NAME || "Impacto Indígena",
    testSegmentId: process.env.BREVO_TEST_SEGMENT_ID || "",
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
  relatedStories: {
    displayCount: 4,
    candidateMultiplier: 3, // fetch 12 candidates for 4 results
    cacheHours: 72, // 3 days in-memory
    httpCacheSeconds: 259200, // 3 days
    modelTier: 'small' as const,
  },
  feedQuality: {
    cacheMinutes: 10,
  },
  dedup: {
    maxCandidates: parseInt(process.env.DEDUP_MAX_CANDIDATES || '6', 10),
    timeWindowDays: parseInt(process.env.DEDUP_TIME_WINDOW_DAYS || '14', 10),
    enabled: process.env.DEDUP_ENABLED !== 'false',
    modelTier: 'small' as const,
  },
  bluesky: {
    handle: process.env.BLUESKY_HANDLE || '',
    appPassword: process.env.BLUESKY_APP_PASSWORD || '',
    serviceUrl: process.env.BLUESKY_SERVICE_URL || 'https://bsky.social',
    autoPost: {
      enabled: process.env.BLUESKY_AUTO_POST_ENABLED === 'true',
      lookbackHours: parseInt(process.env.BLUESKY_LOOKBACK_HOURS || '25', 10),
    },
    metrics: {
      maxAgeDays: parseInt(process.env.BLUESKY_METRICS_MAX_AGE_DAYS || '30', 10),
    },
    postDelayMs: parseInt(process.env.BLUESKY_POST_DELAY_MS || '2000', 10),
    postModelTier: 'medium' as const,
    pickModelTier: 'medium' as const,
  },
  mastodon: {
    instanceUrl: process.env.MASTODON_URL || '',
    accessToken: process.env.MASTODON_TOKEN || '',
    autoPost: {
      enabled: process.env.MASTODON_AUTO_POST_ENABLED === 'true',
    },
    metrics: {
      maxAgeDays: parseInt(process.env.MASTODON_METRICS_MAX_AGE_DAYS || '30', 10),
    },
    postDelayMs: parseInt(process.env.MASTODON_POST_DELAY_MS || '2000', 10),
    postModelTier: 'medium' as const,
    visibility: (process.env.MASTODON_VISIBILITY || 'unlisted') as 'public' | 'unlisted' | 'private',
    charLimit: parseInt(process.env.MASTODON_CHAR_LIMIT || '500', 10),
  },
  feedback: {
    rateLimitWindowMs: parseInt(process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS || String(60 * 60 * 1000), 10),
    rateLimitMax: parseInt(process.env.FEEDBACK_RATE_LIMIT_MAX || '3', 10),
    messageMaxLength: 2000,
  },
  socialAutoPost: {
    lookbackHours: parseInt(process.env.SOCIAL_LOOKBACK_HOURS || process.env.BLUESKY_LOOKBACK_HOURS || '25', 10),
    pickModelTier: 'medium' as const,
  },
twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    autoPost: {
      enabled: process.env.TWITTER_AUTO_POST_ENABLED === 'true',
    },
    metrics: {
      maxAgeDays: parseInt(process.env.TWITTER_METRICS_MAX_AGE_DAYS || '7', 10),
    },
  },
r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'impacto-indigena-media',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    userId: process.env.INSTAGRAM_USER_ID || '',
    autoPost: {
      enabled: process.env.INSTAGRAM_AUTO_POST_ENABLED === 'true',
    },
  },
  linkedin: {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    authorUrn: process.env.LINKEDIN_AUTHOR_URN || '',
    autoPost: {
      enabled: process.env.LINKEDIN_AUTO_POST_ENABLED === 'true',
    },
  },
  podcast: {
    autoGenerate: {
      enabled: process.env.PODCAST_AUTO_GENERATE_ENABLED === 'true',
    },
    storiesPerEpisode: parseInt(process.env.PODCAST_STORIES_PER_EPISODE || '4', 10),
    voice: (process.env.PODCAST_VOICE || 'nova') as 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer',
  },
} as const;
