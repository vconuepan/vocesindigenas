import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { isAllowedUrl } from '../utils/urlValidation.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import { withRetry } from '../lib/retry.js'

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

export interface ExtractionResult {
  title: string | null
  content: string
  datePublished: string | null
  method: 'selector' | 'readability' | 'pipfeed'
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await withRetry(() => axios.get(url, {
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

async function extractByPipfeed(url: string): Promise<ExtractionResult | null> {
  const apiKey = process.env.PIPFEED_API_KEY
  if (!apiKey) return null

  log.info({ url }, 'attempting PipFeed extraction')

  try {
    const response = await withRetry(() => axios.post(
      'https://news-article-data-extract-and-summarization1.p.rapidapi.com/extract/',
      { url },
      {
        timeout: 15000,
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

  // Tier 3: PipFeed API fallback
  const pipfeedResult = await extractByPipfeed(url)
  if (pipfeedResult) return pipfeedResult

  log.warn({ url }, 'all extraction methods failed')
  return null
}
