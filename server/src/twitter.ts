import { config } from '../config.js'
import { createLogger } from './logger.js'
import { withRetry } from './retry.js'

const log = createLogger('twitter')

function isConfigured(): boolean {
  return Boolean(
    config.twitter.apiKey &&
    config.twitter.apiSecret &&
    config.twitter.accessToken &&
    config.twitter.accessTokenSecret
  )
}

// ---------------------------------------------------------------------------
// Post creation (OAuth 1.0a — required for posting tweets)
// ---------------------------------------------------------------------------

export interface CreateTweetResult {
  id: string
  url: string
}

/**
 * Create a tweet using Twitter API v2 with OAuth 1.0a.
 */
export async function createTweet(text: string): Promise<CreateTweetResult> {
  if (!isConfigured()) {
    throw new Error('Twitter credentials not configured.')
  }

  return withRetry(
    async () => {
      const { TwitterApi } = await import('twitter-api-v2')

      const client = new TwitterApi({
        appKey: config.twitter.apiKey,
        appSecret: config.twitter.apiSecret,
        accessToken: config.twitter.accessToken,
        accessSecret: config.twitter.accessTokenSecret,
      })

      log.info({ textLength: text.length }, 'creating tweet')

      const result = await client.v2.tweet(text)

      const tweetId = result.data.id
      const url = `https://x.com/ImpactoIndigena/status/${tweetId}`

      log.info({ tweetId, url }, 'tweet created')
      return { id: tweetId, url }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface TweetMetrics {
  likeCount: number
  retweetCount: number
  replyCount: number
  quoteCount: number
}

/**
 * Fetch engagement metrics for a tweet.
 */
export async function getTweetMetrics(tweetId: string): Promise<TweetMetrics> {
  if (!isConfigured()) {
    throw new Error('Twitter credentials not configured.')
  }

  return withRetry(
    async () => {
      const { TwitterApi } = await import('twitter-api-v2')

      const client = new TwitterApi({
        appKey: config.twitter.apiKey,
        appSecret: config.twitter.apiSecret,
        accessToken: config.twitter.accessToken,
        accessSecret: config.twitter.accessTokenSecret,
      })

      const tweet = await client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics'],
      })

      const metrics = tweet.data.public_metrics

      return {
        likeCount: metrics?.like_count ?? 0,
        retweetCount: metrics?.retweet_count ?? 0,
        replyCount: metrics?.reply_count ?? 0,
        quoteCount: metrics?.quote_count ?? 0,
      }
    },
    { retries: 2, baseDelayMs: 2000 },
  )
}

export { isConfigured as isTwitterConfigured }
