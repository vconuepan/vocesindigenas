import Parser from 'rss-parser'
import axios from 'axios'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { withRetry } from '../lib/retry.js'
import { normalizeUrl } from '../utils/urlNormalization.js'
import { summarizeError } from '../utils/errors.js'
import { crawlLimiter } from '../lib/crawlLimiter.js'
import { SCRAPED_FEED_URLS, scrapeDISD } from './disdScraper.js'

const log = createLogger('rssParser')

const parser = new Parser()

export interface RSSItem {
  url: string
  title: string
  datePublished: string | null
  description: string | null
  imageUrl: string | null
}

export interface FeedCacheHeaders {
  etag?: string | null
  lastModified?: string | null
}

export interface ParseFeedResult {
  items: RSSItem[]
  notModified: boolean
  cacheHeaders: FeedCacheHeaders
}

export async function parseFeed(feedUrl: string, cacheHeaders?: FeedCacheHeaders): Promise<ParseFeedResult> {
  // Route HTML-scraped feeds to their dedicated scrapers instead of the RSS parser
  if (SCRAPED_FEED_URLS.has(feedUrl)) {
    return scrapeDISD(feedUrl)
  }

  try {
    const headers: Record<string, string> = {
      // Mimic a real browser so sites that block generic bots (UN, OHCHR, etc.) respond correctly
      'User-Agent': 'Mozilla/5.0 (compatible; ImpactoIndigenaCrawler/1.0; +https://impactoindigena.news)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    }
    if (cacheHeaders?.etag) {
      headers['If-None-Match'] = cacheHeaders.etag
    }
    if (cacheHeaders?.lastModified) {
      headers['If-Modified-Since'] = cacheHeaders.lastModified
    }

    const response = await crawlLimiter.run(feedUrl, () =>
      withRetry(() => axios.get(feedUrl, {
        timeout: config.crawl.httpTimeoutMs,
        maxRedirects: 3,
        headers,
        responseType: 'text',
        maxContentLength: 5 * 1024 * 1024, // 5 MB cap to prevent OOM on huge responses
        validateStatus: (status) => status === 200 || status === 304,
      }))
    )

    if (response.status === 304) {
      log.debug({ feedUrl }, 'feed not modified (304)')
      return {
        items: [],
        notModified: true,
        cacheHeaders: {
          etag: cacheHeaders?.etag || null,
          lastModified: cacheHeaders?.lastModified || null,
        },
      }
    }

    const feed = await parser.parseString(response.data)
    const items: RSSItem[] = []

    for (const item of feed.items.slice(0, config.crawl.rssItemLimit)) {
      const url = item.link
      if (!url) continue

      items.push({
  url: normalizeUrl(url),
  title: item.title || 'Untitled',
  datePublished: item.isoDate || item.pubDate || null,
  description: item.contentSnippet || item.content || null,
  imageUrl: item.enclosure?.url || item['media:content']?.['$']?.url || item['media:thumbnail']?.['$']?.url || null,
})
    }

    return {
      items,
      notModified: false,
      cacheHeaders: {
        etag: response.headers['etag'] || null,
        lastModified: response.headers['last-modified'] || null,
      },
    }
  } catch (err) {
    log.error({ feedUrl, reason: summarizeError(err) }, 'failed to parse feed')
    return { items: [], notModified: false, cacheHeaders: {} }
  }
}
