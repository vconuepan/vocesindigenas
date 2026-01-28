import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

const HTTP_TIMEOUT = 10000
const USER_AGENT = 'ActuallyRelevant/1.0 (news curation bot; +https://actuallyrelevant.news)'

export interface ExtractionResult {
  title: string | null
  content: string
  datePublished: string | null
  method: 'selector' | 'readability' | 'pipfeed'
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: HTTP_TIMEOUT,
      headers: { 'User-Agent': USER_AGENT },
      maxRedirects: 5,
      responseType: 'text',
    })
    return response.data
  } catch (err) {
    console.error(`[extractor] Failed to fetch: ${url}`, err instanceof Error ? err.message : err)
    return null
  }
}

function extractBySelector(html: string, selector: string): ExtractionResult | null {
  try {
    const $ = cheerio.load(html)
    const container = $(selector).first()
    if (!container.length) return null

    const text = container.text().replace(/\s+/g, ' ').trim()
    if (!text || text.length < 50) return null

    return {
      title: $('title').text().trim() || null,
      content: text,
      datePublished: null,
      method: 'selector',
    }
  } catch (err) {
    console.error('[extractor] Selector extraction failed:', err instanceof Error ? err.message : err)
    return null
  }
}

function extractByReadability(html: string, url: string): ExtractionResult | null {
  try {
    const dom = new JSDOM(html, { url })
    const article = new Readability(dom.window.document).parse()
    if (!article || !article.textContent || article.textContent.trim().length < 50) return null

    return {
      title: article.title || null,
      content: article.textContent.trim(),
      datePublished: null,
      method: 'readability',
    }
  } catch (err) {
    console.error('[extractor] Readability extraction failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function extractByPipfeed(url: string): Promise<ExtractionResult | null> {
  const apiKey = process.env.PIPFEED_API_KEY
  if (!apiKey) return null

  try {
    const response = await axios.post(
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
    )

    const data = response.data
    if (!data?.text || data.text.length < 50) return null

    return {
      title: data.title || null,
      content: data.text,
      datePublished: data.date || null,
      method: 'pipfeed',
    }
  } catch (err) {
    console.error('[extractor] PipFeed extraction failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function extractContent(
  url: string,
  options?: { htmlSelector?: string | null }
): Promise<ExtractionResult | null> {
  const html = await fetchPage(url)
  if (!html) return null

  // Tier 1: CSS selector extraction
  if (options?.htmlSelector) {
    const result = extractBySelector(html, options.htmlSelector)
    if (result) return result
  }

  // Tier 2: Readability extraction
  const readabilityResult = extractByReadability(html, url)
  if (readabilityResult) return readabilityResult

  // Tier 3: PipFeed API fallback
  const pipfeedResult = await extractByPipfeed(url)
  if (pipfeedResult) return pipfeedResult

  console.warn(`[extractor] All extraction methods failed for: ${url}`)
  return null
}
