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

export interface CreateTweetResult {
  id: string
  url: string
}

/**
 * Descarga una imagen desde una URL y retorna el buffer.
 */
async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Crea un tweet con texto e imagen opcional usando Twitter API v2 con OAuth 1.0a.
 */
export async function createTweet(text: string, imageUrl?: string): Promise<CreateTweetResult> {
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

      log.info({ textLength: text.length, hasImage: !!imageUrl }, 'creating tweet')

      let mediaId: string | undefined

      // Subir imagen si existe
      if (imageUrl) {
        try {
          const imageBuffer = await fetchImageBuffer(imageUrl)
          const mediaUpload = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' })
          mediaId = mediaUpload
          log.info({ mediaId }, 'image uploaded to Twitter')
        } catch (err) {
          log.warn({ err }, 'failed to upload image to Twitter, posting without image')
        }
      }

      const tweetOptions: any = { text }
      if (mediaId) {
        tweetOptions.media = { media_ids: [mediaId] }
      }

      const result = await client.v2.tweet(tweetOptions)

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
