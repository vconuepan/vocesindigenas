import Parser from 'rss-parser'
import { createLogger } from '../lib/logger.js'
import { withRetry } from '../lib/retry.js'

const log = createLogger('rssParser')

const parser = new Parser({
  timeout: 10000,
  maxRedirects: 3,
})

export interface RSSItem {
  url: string
  title: string
  datePublished: string | null
  description: string | null
}

export async function parseFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    const feed = await withRetry(() => parser.parseURL(feedUrl))
    const items: RSSItem[] = []

    for (const item of feed.items.slice(0, 20)) {
      const url = item.link
      if (!url) continue

      items.push({
        url,
        title: item.title || 'Untitled',
        datePublished: item.isoDate || item.pubDate || null,
        description: item.contentSnippet || item.content || null,
      })
    }

    return items
  } catch (err) {
    log.error({ feedUrl, err }, 'failed to parse feed')
    return []
  }
}
