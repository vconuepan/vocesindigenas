import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { isAllowedUrl } from '../utils/urlValidation.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { withRetry, isRetryableError } from '../lib/retry.js'
import { crawlLimiter } from '../lib/crawlLimiter.js'

const log = createLogger('extractor')
const USER_AGENT = 'ActuallyRelevant/1.0 (news curation bot; +https://actuallyrelevant.news)'

function summarizeError(err: unknown): string {
  if (err instanceof Error && 'isAxiosError' in err) {
    const axiosErr = err as { response?: { status?: number }; code?: string; message: string }
    if (axiosErr.response?.status) return `HTTP ${axiosErr.response.status}`
    if (axiosErr.code) return axiosErr.code
    return axiosErr.message
  }
  return err instanceof Error ? err.message : String(err)
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof Error && 'isAxiosError' in err) {
    const status = (err as { response?: { status?: number } }).response?.status
    return status === 429
  }
  return false
}

export interface ExtractionResult {
  title: string | null
  content: string
  datePublished: string | null
  method: 'selector' | 'readability' | 'diffbot' | 'pipfeed'
}

export class MinuteRateLimiter {
  private timestamps: number[] = []
  constructor(private maxPerMinute: number) {}

  async acquire(): Promise<void> {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < 60000)
    if (this.timestamps.length >= this.maxPerMinute) {
      const waitMs = 60000 - (now - this.timestamps[0]!)
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
    this.timestamps.push(Date.now())
  }

  reset(): void {
    this.timestamps = []
  }
}

const diffbotLimiter = new MinuteRateLimiter(config.crawl.diffbotRateLimit)
let diffbotQuotaExhausted = false

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await crawlLimiter.run(url, () =>
      withRetry(() => axios.get(url, {
        timeout: config.crawl.httpTimeoutMs,
        headers: { 'User-Agent': USER_AGENT },
        maxRedirects: 5,
        responseType: 'text',
        beforeRedirect: (options: Record<string, any>) => {
          const redirectUrl = typeof options.href === 'string' ? options.href
            : `${options.protocol}//${options.hostname}${options.path}`
          if (!isAllowedUrl(redirectUrl)) {
            throw new Error(`Blocked redirect to disallowed URL: ${redirectUrl}`)
          }
        },
      }))
    )
    return response.data
  } catch (err) {
    log.warn({ url, reason: summarizeError(err) }, 'page fetch failed')
    return null
  }
}

function extractBySelector(html: string, selector: string): ExtractionResult | null {
  try {
    const $ = cheerio.load(html)
    const container = $(selector).first()
    if (!container.length) return null

    const text = container.text().replace(/\s+/g, ' ').trim()
    if (!text || text.length < config.crawl.minContentLength) return null

    return {
      title: $('title').text().trim() || null,
      content: text,
      datePublished: null,
      method: 'selector',
    }
  } catch (err) {
    log.warn({ reason: summarizeError(err) }, 'selector extraction failed')
    return null
  }
}

function extractByReadability(html: string, url: string): ExtractionResult | null {
  try {
    const dom = new JSDOM(html, { url })
    const article = new Readability(dom.window.document).parse()
    if (!article || !article.textContent || article.textContent.trim().length < config.crawl.minContentLength) return null

    return {
      title: article.title || null,
      content: article.textContent.trim(),
      datePublished: null,
      method: 'readability',
    }
  } catch (err) {
    log.warn({ reason: summarizeError(err) }, 'readability extraction failed')
    return null
  }
}

async function extractByDiffbot(url: string): Promise<ExtractionResult | null> {
  if (diffbotQuotaExhausted) return null
  const token = process.env.DIFFBOT_TOKEN
  if (!token) return null

  log.info({ url }, 'attempting Diffbot extraction')

  try {
    await diffbotLimiter.acquire()

    const response = await withRetry(() => axios.get(
      'https://api.diffbot.com/v3/article',
      {
        timeout: config.crawl.diffbotTimeoutMs,
        params: {
          token,
          url,
          discussion: false,
          paging: false,
        },
      }
    ), {
      retryOn: (err) => {
        // Don't retry 429 — it's a quota limit, not a transient error
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 429) return false
        return isRetryableError(err)
      },
    })

    const article = response.data?.objects?.[0]
    if (!article?.text || article.text.length < config.crawl.minContentLength) {
      log.warn({ url, contentLength: article?.text?.length ?? 0 }, 'Diffbot returned insufficient content')
      return null
    }

    log.info({ url, contentLength: article.text.length }, 'Diffbot extraction succeeded')
    return {
      title: article.title || null,
      content: article.text,
      datePublished: article.date || article.estimatedDate || null,
      method: 'diffbot',
    }
  } catch (err) {
    if (isQuotaError(err)) {
      diffbotQuotaExhausted = true
      log.warn('Diffbot quota exhausted, falling back to PipFeed for remaining extractions')
    }
    log.warn({ url, reason: summarizeError(err) }, 'Diffbot extraction failed')
    return null
  }
}

async function extractByPipfeed(url: string): Promise<ExtractionResult | null> {
  const apiKey = process.env.PIPFEED_API_KEY
  if (!apiKey) return null

  log.info({ url }, 'attempting PipFeed extraction')

  try {
    const response = await withRetry(() => axios.post(
      'https://news-article-data-extract-and-summarization1.p.rapidapi.com/extract/',
      { url },
      {
        timeout: config.crawl.pipfeedTimeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'news-article-data-extract-and-summarization1.p.rapidapi.com',
        },
      }
    ))

    const data = response.data
    if (!data?.text || data.text.length < config.crawl.minContentLength) {
      log.warn({ url, contentLength: data?.text?.length ?? 0 }, 'PipFeed returned insufficient content')
      return null
    }

    log.info({ url, contentLength: data.text.length }, 'PipFeed extraction succeeded')
    return {
      title: data.title || null,
      content: data.text,
      datePublished: data.date || null,
      method: 'pipfeed',
    }
  } catch (err) {
    log.warn({ url, reason: summarizeError(err) }, 'PipFeed extraction failed')
    return null
  }
}

async function extractByApi(url: string, api: 'diffbot' | 'pipfeed'): Promise<ExtractionResult | null> {
  return api === 'diffbot' ? extractByDiffbot(url) : extractByPipfeed(url)
}

export async function extractContent(
  url: string,
  options?: { htmlSelector?: string | null }
): Promise<ExtractionResult | null> {
  if (!isAllowedUrl(url)) {
    log.warn({ url }, 'blocked disallowed URL')
    return null
  }

  const html = await fetchPage(url)

  // Tier 1: CSS selector extraction
  if (html && options?.htmlSelector) {
    const result = extractBySelector(html, options.htmlSelector)
    if (result) return result
  }

  // Tier 2: Readability extraction
  if (html) {
    const readabilityResult = extractByReadability(html, url)
    if (readabilityResult) return readabilityResult
  }

  // Tier 3: External API fallback (preferred → fallback)
  const preferred = config.crawl.extractionApi
  const fallback = preferred === 'diffbot' ? 'pipfeed' : 'diffbot'

  const preferredResult = await extractByApi(url, preferred)
  if (preferredResult) return preferredResult

  const fallbackResult = await extractByApi(url, fallback)
  if (fallbackResult) return fallbackResult

  log.warn({ url }, 'all extraction methods failed')
  return null
}

// Exported for testing only
export function _resetDiffbotQuota(): void {
  diffbotQuotaExhausted = false
  diffbotLimiter.reset()
}
