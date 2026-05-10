/**
 * Backfill script — Tribunal Constitucional de Chile, all 2026 articles.
 *
 * Fetches the full list of 2026 posts from the TC WordPress REST API,
 * then calls crawlUrl() for each one to extract content and insert into
 * the stories table (status = 'fetched', ready for pre-screening pipeline).
 *
 * Run with:
 *   npx tsx src/scripts/backfill-tc-2026.ts --prefix server
 * or from the server/ directory:
 *   npx tsx src/scripts/backfill-tc-2026.ts
 */
import 'dotenv/config'
import axios from 'axios'
import { crawlUrl } from '../services/crawler.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('backfill-tc-2026')

const TC_FEED_ID = '23b51191-b43a-4306-ac20-78d6a210cd30'
const TC_WP_API = 'https://www1.tribunalconstitucional.cl/wp-json/wp/v2/posts'

interface WPPost {
  date: string
  link: string
  title: { rendered: string }
}

async function fetchAll2026Posts(): Promise<WPPost[]> {
  const response = await axios.get<WPPost[]>(TC_WP_API, {
    params: {
      per_page: 100,
      after: '2026-01-01T00:00:00',
      before: '2026-12-31T23:59:59',
      _fields: 'date,title,link',
    },
    timeout: 15_000,
  })
  return response.data
}

async function main() {
  log.info('fetching 2026 TC posts from WordPress API...')
  const posts = await fetchAll2026Posts()
  log.info({ count: posts.length }, 'posts found — starting backfill')

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const post of posts.sort((a, b) => a.date.localeCompare(b.date))) {
    const url = post.link
    const title = post.title.rendered
      .replace(/&#8211;/g, '–')
      .replace(/&#8216;/g, '‘')
      .replace(/&#8217;/g, '’')
      .replace(/&#8220;/g, '“')
      .replace(/&#8221;/g, '”')

    try {
      const result = await crawlUrl(url, TC_FEED_ID)
      if (result) {
        log.info({ url, storyId: result.storyId }, `✓ imported: ${title}`)
        imported++
      } else {
        log.warn({ url }, `✗ extraction returned null: ${title}`)
        failed++
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('already crawled') || msg.includes('Unique constraint')) {
        log.info({ url }, `→ skipped (already in DB): ${title}`)
        skipped++
      } else {
        log.warn({ url, err: msg }, `✗ failed: ${title}`)
        failed++
      }
    }

    // Small delay to avoid hammering TC's server
    await new Promise(r => setTimeout(r, 800))
  }

  log.info({ imported, skipped, failed, total: posts.length }, 'backfill complete')
  process.exit(0)
}

main().catch(err => {
  log.error({ err }, 'fatal error')
  process.exit(1)
})
