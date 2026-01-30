import { parseFeed } from './rssParser.js'
import { extractContent } from './extractor.js'
import { getExistingUrls, createStory } from './story.js'
import { getFeedById, getDueFeeds, updateLastCrawled } from './feed.js'

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
        console.warn(`[crawler] No content extracted for: ${item.url}`)
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
      console.error(`[crawler] Failed to process: ${item.url}`, err instanceof Error ? err.message : err)
      result.errors++
    }
  }

  await updateLastCrawled(feedId)
  return result
}

export async function crawlAllDueFeeds(): Promise<CrawlResult[]> {
  const dueFeeds = await getDueFeeds()
  console.log(`[crawler] ${dueFeeds.length} feeds due for crawling`)

  const results: CrawlResult[] = []
  for (const feed of dueFeeds) {
    try {
      const result = await crawlFeed(feed.id)
      results.push(result)
      console.log(`[crawler] ${result.feedTitle}: ${result.newStories} new, ${result.skipped} skipped, ${result.errors} errors`)
    } catch (err) {
      console.error(`[crawler] Failed to crawl feed ${feed.title}:`, err instanceof Error ? err.message : err)
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
