import { parseFeed } from './rssParser.js'
import { extractContent } from './extractor.js'
import { getExistingUrls, createStory } from './story.js'
import { getFeedById, getDueFeeds, updateLastCrawled } from './feed.js'
import { createLogger } from '../lib/logger.js'
import { Semaphore } from '../lib/semaphore.js'
import { config } from '../config.js'

const log = createLogger('crawler')

export interface CrawlResult {
  feedId: string
  feedTitle: string
  newStories: number
  skipped: number
  errors: number
}

export async function crawlFeed(feedId: string): Promise<CrawlResult> {
  const feed = await getFeedById(feedId)
  if (!feed) throw new Error('Feed not found')

  const result: CrawlResult = {
    feedId,
    feedTitle: feed.title,
    newStories: 0,
    skipped: 0,
    errors: 0,
  }

  // Parse RSS feed
  const rssItems = await parseFeed(feed.url)
  if (rssItems.length === 0) {
    await updateLastCrawled(feedId)
    return result
  }

  // Deduplicate against existing stories
  const rssUrls = rssItems.map(item => item.url)
  const existingUrls = await getExistingUrls(rssUrls)
  const newItems = rssItems.filter(item => !existingUrls.has(item.url))
  result.skipped = rssItems.length - newItems.length

  // Extract content and create stories (parallel with concurrency limit)
  const articleSemaphore = new Semaphore(config.concurrency.crawlArticles)
  await Promise.allSettled(
    newItems.map(item => articleSemaphore.run(async () => {
      try {
        const extracted = await extractContent(item.url, {
          htmlSelector: feed.htmlSelector,
        })

        if (!extracted) {
          log.warn({ url: item.url }, 'no content extracted')
          result.errors++
          return
        }

        await createStory({
          sourceUrl: item.url,
          sourceTitle: extracted.title || item.title,
          sourceContent: extracted.content,
          feedId,
          sourceDatePublished: extracted.datePublished || item.datePublished || undefined,
        })

        result.newStories++
      } catch (err) {
        log.error({ url: item.url, err }, 'failed to process item')
        result.errors++
      }
    }))
  )

  await updateLastCrawled(feedId)
  return result
}

export async function crawlAllDueFeeds(): Promise<CrawlResult[]> {
  const dueFeeds = await getDueFeeds()
  log.info({ feedCount: dueFeeds.length }, 'feeds due for crawling')

  const feedSemaphore = new Semaphore(config.concurrency.crawlFeeds)
  const total = dueFeeds.length
  let completed = 0

  const settled = await Promise.allSettled(
    dueFeeds.map(feed => feedSemaphore.run(async () => {
      try {
        const result = await crawlFeed(feed.id)
        completed++
        log.info({ progress: `${completed}/${total}`, feed: result.feedTitle, new: result.newStories, skipped: result.skipped, errors: result.errors }, 'feed crawl complete')
        return result
      } catch (err) {
        completed++
        log.error({ feed: feed.title, err }, 'failed to crawl feed')
        return {
          feedId: feed.id,
          feedTitle: feed.title,
          newStories: 0,
          skipped: 0,
          errors: 1,
        }
      }
    }))
  )

  return settled.map(s => s.status === 'fulfilled' ? s.value : {
    feedId: '',
    feedTitle: 'unknown',
    newStories: 0,
    skipped: 0,
    errors: 1,
  })
}

export async function crawlUrl(url: string, feedId: string): Promise<{ storyId: string } | null> {
  const feed = await getFeedById(feedId)
  if (!feed) throw new Error('Feed not found')

  // Check not already crawled
  const existing = await getExistingUrls([url])
  if (existing.has(url)) {
    throw new Error('URL already crawled')
  }

  const extracted = await extractContent(url, {
    htmlSelector: feed.htmlSelector,
  })

  if (!extracted) return null

  const story = await createStory({
    sourceUrl: url,
    sourceTitle: extracted.title || 'Untitled',
    sourceContent: extracted.content,
    feedId,
    sourceDatePublished: extracted.datePublished || undefined,
  })

  return { storyId: story.id }
}
