import { parseFeed } from './rssParser.js'
import { extractContent } from './extractor.js'
import { getExistingUrls, createStory } from './story.js'
import { getFeedById, getDueFeeds, updateLastCrawled } from './feed.js'
import { createLogger } from '../lib/logger.js'

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

  // Extract content and create stories
  for (const item of newItems) {
    try {
      const extracted = await extractContent(item.url, {
        htmlSelector: feed.htmlSelector,
      })

      if (!extracted) {
        log.warn({ url: item.url }, 'no content extracted')
        result.errors++
        continue
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
  }

  await updateLastCrawled(feedId)
  return result
}

export async function crawlAllDueFeeds(): Promise<CrawlResult[]> {
  const dueFeeds = await getDueFeeds()
  log.info({ feedCount: dueFeeds.length }, 'feeds due for crawling')

  const results: CrawlResult[] = []
  const total = dueFeeds.length
  for (let i = 0; i < dueFeeds.length; i++) {
    const feed = dueFeeds[i]
    try {
      const result = await crawlFeed(feed.id)
      results.push(result)
      log.info({ progress: `${i + 1}/${total}`, feed: result.feedTitle, new: result.newStories, skipped: result.skipped, errors: result.errors }, 'feed crawl complete')
    } catch (err) {
      log.error({ feed: feed.title, err }, 'failed to crawl feed')
      results.push({
        feedId: feed.id,
        feedTitle: feed.title,
        newStories: 0,
        skipped: 0,
        errors: 1,
      })
    }
  }

  return results
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
