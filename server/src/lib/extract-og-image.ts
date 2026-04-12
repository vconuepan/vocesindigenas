import { createLogger } from './logger.js'
import { withRetry } from './retry.js'

const log = createLogger('extract-og-image')

/**
 * Fetches a URL and extracts the og:image meta tag value.
 * Returns null if not found or on any error.
 */
export async function fetchOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const html = await withRetry(async () => {
      const res = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImpactoIndigenaCrawler/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    })

    // Match og:image — handle both property= and name= forms, single or double quotes
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

    if (!match) return null

    const url = match[1].trim()
    // Basic sanity check — must look like an absolute URL
    if (!url.startsWith('http')) return null

    return url
  } catch (err) {
    log.warn({ sourceUrl, err }, 'could not extract og:image')
    return null
  }
}
