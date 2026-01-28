import { crawlAllDueFeeds } from '../services/crawler.js'

export async function runCrawlFeeds(): Promise<void> {
  console.log('[crawl_feeds] Starting...')
  const results = await crawlAllDueFeeds()
  const totalNew = results.reduce((sum, r) => sum + r.newStories, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
  console.log(`[crawl_feeds] Done: ${results.length} feeds, ${totalNew} new stories, ${totalErrors} errors`)
}
