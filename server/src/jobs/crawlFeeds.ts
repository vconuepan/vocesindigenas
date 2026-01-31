import { crawlAllDueFeeds } from '../services/crawler.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('crawl_feeds')

export async function runCrawlFeeds(): Promise<void> {
  log.info('starting crawl')
  const results = await crawlAllDueFeeds()
  const totalNew = results.reduce((sum, r) => sum + r.newStories, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
  log.info({ feedCount: results.length, newStories: totalNew, errors: totalErrors }, 'crawl finished')
}
