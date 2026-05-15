/**
 * El Austral de Temuco scraper — v2 (HTML edition)
 *
 * El Austral migrated from a PDF digital replica to a JPG image viewer.
 * The new digital edition lives at:
 *
 *   https://www.australtemuco.cl/impresa/{YYYY}/{MM}/{DD}/papel/
 *
 * Strategy:
 *   1. Fetch the edition index page for today's date (with auth cookie).
 *   2. Parse the HTML for article listings embedded in the viewer.
 *   3. If the index page has individual page links, fetch each page's HTML
 *      and look for article text content.
 *   4. Filter by indigenous-relevant keywords.
 *   5. Return matching articles as RSSItem objects.
 *
 * Authentication:
 *   The digital edition requires a Pasedigital subscription. Set the env var
 *   AUSTRAL_COOKIE to the value of the Cookie header from an authenticated
 *   browser session on australtemuco.cl or impresa.soy-chile.cl.
 *
 *   If AUSTRAL_COOKIE is not set, the scraper logs a warning and returns empty.
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { createLogger } from '../lib/logger.js'
import { withRetry } from '../lib/retry.js'
import { crawlLimiter } from '../lib/crawlLimiter.js'
import type { ParseFeedResult, RSSItem } from './rssParser.js'

const log = createLogger('austral-scraper')

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.australtemuco.cl'

/** Feed URL sentinel — matched in rssParser.ts to route here */
export const AUSTRAL_FEED_URL = 'https://www.australtemuco.cl/impresa/'

/** Max pages to probe in the edition (El Austral typically 16–24 pages) */
const MAX_PAGES = 28

/** Pause between page fetches to avoid hammering the server */
const PAGE_DELAY_MS = 800

// ─── URL builders ─────────────────────────────────────────────────────────────

function buildEditionUrl(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${BASE_URL}/impresa/${yyyy}/${mm}/${dd}/papel/`
}

function buildPageUrl(date: Date, pageNum: number): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${BASE_URL}/impresa/${yyyy}/${mm}/${dd}/papel/${pageNum}/`
}

// ─── Indigenous content detection ─────────────────────────────────────────────

const INDIGENOUS_KEYWORDS = [
  'mapuche', 'indígena', 'indigena', 'pueblo originario', 'comunidad indígena',
  'comunidad indigena', 'conadi', 'araucanía', 'araucania', 'pehuenche',
  'lafkenche', 'huilliche', 'williche', 'territorio ancestral',
  'tierras indígenas', 'tierras indigenas', 'conflicto mapuche',
  'pueblo nación', 'pueblo nacion', 'macrozona sur', 'wallmapu',
  'lonko', 'machi', 'weichafe', 'lof ', 'lof\n', 'ley indígena',
  'ley indigena', 'convenio 169', 'ley lafkenche', 'alzamiento mapuche',
  'restitución de tierras', 'restitucion de tierras',
]

function hasIndigenousContent(text: string): boolean {
  const lower = text.toLowerCase()
  return INDIGENOUS_KEYWORDS.some(kw => lower.includes(kw))
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function buildHeaders(cookie?: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/',
  }
  if (cookie) h['Cookie'] = cookie
  return h
}

interface FetchResult {
  html: string
  status: number
  finalUrl: string
  notFound: boolean
  authRequired: boolean
}

async function fetchPage(url: string, cookie?: string): Promise<FetchResult> {
  try {
    const res = await crawlLimiter.run(url, () =>
      withRetry(() =>
        axios.get(url, {
          timeout: 20_000,
          maxRedirects: 5,
          responseType: 'text',
          headers: buildHeaders(cookie),
          validateStatus: (s) => s === 200,
        })
      )
    )
    return {
      html: res.data as string,
      status: 200,
      finalUrl: res.request?.res?.responseUrl ?? url,
      notFound: false,
      authRequired: false,
    }
  } catch (err: any) {
    const status = err?.response?.status as number | undefined
    if (status === 404) return { html: '', status: 404, finalUrl: url, notFound: true, authRequired: false }
    if (status === 401 || status === 403) return { html: '', status: status, finalUrl: url, notFound: false, authRequired: true }
    log.debug({ url, err: err?.message }, 'page fetch failed')
    return { html: '', status: 0, finalUrl: url, notFound: true, authRequired: false }
  }
}

// ─── HTML parsing helpers ──────────────────────────────────────────────────────

/**
 * Extract all visible text from a page's main content area.
 * Tries common content selectors before falling back to <body>.
 */
function extractPageText($: cheerio.CheerioAPI): string {
  // Try specific content containers first
  const contentSelectors = [
    '.article-content', '.article-text', '.article-body',
    '.news-content', '.noticia-content', '.contenido',
    '.page-content', '.article', 'article',
    'main', '#content', '.content',
  ]

  for (const sel of contentSelectors) {
    const text = $(sel).text().trim()
    if (text.length > 100) return text
  }

  // Last resort: all body text minus navigation/headers
  $('nav, header, footer, script, style, .menu, .nav, .header, .footer').remove()
  return $('body').text().trim()
}

/**
 * Extract article links and their titles from an edition page.
 * Handles both the index listing page and individual newspaper page viewers.
 */
function extractArticleItems($: cheerio.CheerioAPI, baseUrl: string): Array<{ url: string; title: string; text: string; imgUrl: string | null }> {
  const items: Array<{ url: string; title: string; text: string; imgUrl: string | null }> = []
  const seen = new Set<string>()

  // Pattern 1: Explicit article/news item containers
  const articleSelectors = [
    'article', '.article', '.news-item', '.noticia',
    '.story', '.post', '.item-noticia',
    '.most-read-item', '.mas-leidas-item',
    '[class*="article"]', '[class*="noticia"]',
  ]

  for (const sel of articleSelectors) {
    $(sel).each((_i, el) => {
      const $el = $(el)
      const $link = $el.find('a[href]').first()
      const href = $link.attr('href') ?? $el.closest('a').attr('href') ?? ''
      if (!href || seen.has(href)) return

      const title = ($el.find('h1, h2, h3, h4').first().text().trim()
        || $link.text().trim()
        || $el.attr('title') || '').slice(0, 200)
      if (!title) return

      const articleUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      const text = $el.text().trim()
      const imgUrl = $el.find('img').attr('src') ?? null

      seen.add(href)
      items.push({ url: articleUrl, title, text, imgUrl: imgUrl ?? null })
    })
    if (items.length > 0) break
  }

  // Pattern 2: Any heading inside a link that looks like an article URL
  if (items.length === 0) {
    $('a[href]').each((_i, el) => {
      const $el = $(el)
      const href = $el.attr('href') ?? ''
      if (!href || seen.has(href)) return
      if (!isArticleUrl(href)) return

      const title = ($el.find('h1, h2, h3, h4').first().text().trim()
        || $el.attr('title')
        || $el.text().trim()).slice(0, 200)
      if (!title || title.length < 10) return

      const articleUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      seen.add(href)
      items.push({ url: articleUrl, title, text: $el.text().trim(), imgUrl: null })
    })
  }

  return items
}

/** Heuristic to detect article-like URLs (not menus, login pages, etc.) */
function isArticleUrl(href: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('javascript')) return false
  // Exclude obvious non-article paths
  const excluded = ['/login', '/suscribirse', '/contacto', '/quienes-somos',
    '/publicidad', '/terminos', '/privacidad', '/newsletter', '/rss',
    '?', 'mailto:', 'tel:', '/impresa/']
  if (excluded.some(p => href.includes(p))) return false
  // Prefer paths that look like article slugs or dated content
  return href.includes('/') && (
    /\/\d{4}\/\d{2}\/\d{2}\//.test(href)  // dated: /2024/01/15/
    || /\/(noticias|contenido|opinion|nacional|region|economia|politica|cultura)\//.test(href)
    || href.split('/').length >= 3
  )
}

// ─── Edition page discovery ────────────────────────────────────────────────────

/**
 * Try to discover the correct edition URL for a given date.
 * australtemuco.cl may redirect, so we follow redirects and check the final URL.
 */
async function findEditionUrl(date: Date, cookie?: string): Promise<string | null> {
  const candidateUrl = buildEditionUrl(date)
  const result = await fetchPage(candidateUrl, cookie)

  if (result.notFound) {
    log.info({ date: date.toISOString().split('T')[0], candidateUrl }, 'edition not found at primary URL')
    return null
  }
  if (result.authRequired) {
    log.warn({ date: date.toISOString().split('T')[0] }, 'El Austral digital edition requires auth — set AUSTRAL_COOKIE env var')
    return null
  }

  // Check if we were redirected to a login page
  if (result.finalUrl.includes('/login') || result.finalUrl.includes('/suscri')) {
    log.warn({ date: date.toISOString().split('T')[0], redirectedTo: result.finalUrl }, 'redirected to login — AUSTRAL_COOKIE may be expired')
    return null
  }

  return result.finalUrl
}

// ─── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeAustralEdition(date: Date): Promise<ParseFeedResult> {
  const cookie = process.env.AUSTRAL_COOKIE
  const dateStr = date.toISOString().split('T')[0]

  if (!cookie) {
    log.warn({ date: dateStr }, 'AUSTRAL_COOKIE not set — El Austral scraper disabled')
    return { items: [], notModified: false, cacheHeaders: {} }
  }

  log.info({ date: dateStr }, 'scraping El Austral edition')

  // Step 1: Verify the edition exists
  const editionUrl = await findEditionUrl(date, cookie)
  if (!editionUrl) {
    return { items: [], notModified: false, cacheHeaders: {} }
  }

  log.debug({ date: dateStr, editionUrl }, 'edition URL resolved')

  // Step 2: Fetch the edition index page and look for article content
  const indexResult = await fetchPage(editionUrl, cookie)
  if (!indexResult.html) {
    log.info({ date: dateStr }, 'empty response from edition index page')
    return { items: [], notModified: false, cacheHeaders: {} }
  }

  const $index = cheerio.load(indexResult.html)
  const items: RSSItem[] = []
  const seenUrls = new Set<string>()

  // Step 3: Check for article listings on the index page
  const indexArticles = extractArticleItems($index, editionUrl)
  log.debug({ date: dateStr, found: indexArticles.length }, 'articles found on index page')

  for (const art of indexArticles) {
    if (seenUrls.has(art.url)) continue
    seenUrls.add(art.url)

    const combinedText = `${art.title} ${art.text}`
    if (!hasIndigenousContent(combinedText)) continue

    items.push({
      url: art.url,
      title: art.title,
      datePublished: date.toISOString(),
      description: art.text.slice(0, 300).trim(),
      imageUrl: art.imgUrl ?? null,
    })
    log.info({ date: dateStr, title: art.title, url: art.url }, 'indigenous content found in index')
  }

  // Step 4: Also probe individual page URLs for embedded article text
  // (Pasedigital renders article text per-page for SEO/search)
  const fullPageText = extractPageText($index)
  if (fullPageText.length > 200) {
    log.debug({ date: dateStr, textLen: fullPageText.length }, 'probing index page full text')
  }

  // Step 5: Probe individual edition pages (numbered /papel/1/, /papel/2/, ...)
  let consecutiveNotFound = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (consecutiveNotFound >= 3) break  // Stop after 3 consecutive 404s

    const pageUrl = buildPageUrl(date, page)
    if (seenUrls.has(pageUrl)) continue

    await new Promise(r => setTimeout(r, PAGE_DELAY_MS))

    const pageResult = await fetchPage(pageUrl, cookie)

    if (pageResult.notFound) {
      consecutiveNotFound++
      log.debug({ date: dateStr, page, pageUrl }, 'page not found')
      continue
    }
    if (pageResult.authRequired) {
      log.warn({ date: dateStr, page }, 'auth required for page — cookie may have expired')
      break
    }

    consecutiveNotFound = 0
    seenUrls.add(pageUrl)

    const $page = cheerio.load(pageResult.html)
    const pageArticles = extractArticleItems($page, pageUrl)
    const pageFullText = extractPageText($page)
    const allText = pageArticles.map(a => `${a.title} ${a.text}`).join(' ') + ' ' + pageFullText

    if (!hasIndigenousContent(allText)) {
      log.debug({ date: dateStr, page }, 'no indigenous content on page')
      continue
    }

    // Found indigenous content on this page — add sub-articles or the page itself
    const matchingArticles = pageArticles.filter(a => hasIndigenousContent(`${a.title} ${a.text}`))

    if (matchingArticles.length > 0) {
      for (const art of matchingArticles) {
        if (seenUrls.has(art.url)) continue
        seenUrls.add(art.url)
        items.push({
          url: art.url,
          title: art.title,
          datePublished: date.toISOString(),
          description: art.text.slice(0, 300).trim(),
          imageUrl: art.imgUrl ?? null,
        })
        log.info({ date: dateStr, page, title: art.title }, 'indigenous content found on page (article)')
      }
    } else {
      // The page itself has indigenous content but no sub-articles — use the page URL
      const title = extractTitleFromPage($page, date, page)
      items.push({
        url: pageUrl,
        title,
        datePublished: date.toISOString(),
        description: pageFullText.slice(0, 300).trim(),
        imageUrl: null,
      })
      log.info({ date: dateStr, page, title }, 'indigenous content found on page (full-page)')
    }
  }

  log.info({ date: dateStr, count: items.length }, 'El Austral scrape complete')
  return { items, notModified: false, cacheHeaders: {} }
}

/** Best-effort title from page HTML */
function extractTitleFromPage($: cheerio.CheerioAPI, date: Date, pageNum: number): string {
  const fromH = $('h1, h2, h3').first().text().trim()
  if (fromH && fromH.length > 10) {
    return fromH.length > 120 ? fromH.slice(0, 120) + '…' : fromH
  }
  return `El Austral — ${date.toISOString().split('T')[0]} — Pág. ${pageNum}`
}

/**
 * Entry point called by rssParser for the daily feed crawl.
 * Always scrapes today's edition.
 */
export async function scrapeAustral(_url: string): Promise<ParseFeedResult> {
  return scrapeAustralEdition(new Date())
}
