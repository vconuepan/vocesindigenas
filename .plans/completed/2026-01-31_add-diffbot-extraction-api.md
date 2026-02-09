# Plan: Add Diffbot as Alternative Tier 3 Extraction Service

## Goal

Add Diffbot's Article API as an alternative to PipFeed for tier 3 extraction. A global config setting controls which service is preferred. On Diffbot quota exhaustion (429), automatically fall back to PipFeed for the remainder of the crawl cycle with a logged warning.

## Diffbot Article API Reference

- **Endpoint:** `GET https://api.diffbot.com/v3/article`
- **Auth:** Token passed as `token` query parameter
- **Key params:** `url` (required), `timeout` (default 30000ms), `discussion` (comment extraction, default true), `paging` (multi-page concat, default true)
- **Response:** `{ objects: [{ title, text, html, author, authorUrl, date, estimatedDate, images, tags, categories, sentiment, siteName, ... }] }`
- **Free tier:** 5 calls/minute, 10,000 calls/month, no bulk extract
- **Errors:** 401 (bad token), 404 (page download fail), 429 (rate limit), 500 (processing fail)

## Known Limitation

The free tier's 5 calls/minute rate limit means that if many articles need tier 3 extraction in one crawl cycle, Diffbot becomes a bottleneck (e.g., 20 articles = ~4 minutes). In practice most articles succeed at tier 1 (CSS selector) or tier 2 (Readability), so Diffbot handles only the stragglers. When the rate limit is hit (429 response), the system falls back to PipFeed for remaining articles in that cycle.

## Current State

- `server/src/services/extractor.ts` has `extractByPipfeed()` as the only tier 3 option
- PipFeed uses POST to a RapidAPI endpoint with `X-RapidAPI-Key` header
- PipFeed returns `{ title, text, date }` — minimal fields
- Checks `PIPFEED_API_KEY` env var; returns null if absent
- PipFeed timeout is hardcoded at 15000ms (not in config)
- Wrapped in `withRetry()` with default 3 retries + exponential backoff

## Changes

### 1. Config: Add Diffbot settings and extraction API selector

**`server/src/config.ts`:**

```typescript
crawl: {
  // ...existing...
  extractionApi: (process.env.EXTRACTION_API || 'diffbot') as 'diffbot' | 'pipfeed',
  diffbotTimeoutMs: parseInt(process.env.DIFFBOT_TIMEOUT_MS || '15000', 10),
  diffbotRateLimit: parseInt(process.env.DIFFBOT_RATE_LIMIT || '5', 10),
  pipfeedTimeoutMs: parseInt(process.env.PIPFEED_TIMEOUT_MS || '15000', 10),
}
```

- `EXTRACTION_API`: `'diffbot'` (default) or `'pipfeed'` — which service to try first in tier 3
- Also move PipFeed's hardcoded 15000ms timeout into config while we're here

### 2. Add `extractByDiffbot` function (keep `extractByPipfeed`)

**`server/src/services/extractor.ts`:**

New function alongside the existing `extractByPipfeed`:

```typescript
async function extractByDiffbot(url: string): Promise<ExtractionResult | null> {
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
          discussion: false,  // skip comment extraction to save quota
          paging: false,       // don't follow multi-page articles
        },
      }
    ))

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
    log.warn({ url, reason: summarizeError(err) }, 'Diffbot extraction failed')
    return null
  }
}
```

Key differences from PipFeed:
- GET instead of POST
- Token in query params instead of header
- Response nested under `objects[0]` instead of flat
- `discussion: false` and `paging: false` to minimize API usage and latency
- Timeout pulled from config instead of hardcoded

### 3. Rate limiter for Diffbot

**`server/src/services/extractor.ts`:**

```typescript
class MinuteRateLimiter {
  private timestamps: number[] = []
  constructor(private maxPerMinute: number) {}

  async acquire(): Promise<void> {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < 60000)
    if (this.timestamps.length >= this.maxPerMinute) {
      const waitMs = 60000 - (now - this.timestamps[0])
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
    this.timestamps.push(Date.now())
  }
}

const diffbotLimiter = new MinuteRateLimiter(config.crawl.diffbotRateLimit)
```

Called before each Diffbot request to proactively stay within the rate limit window.

### 4. Quota exhaustion fallback logic

**`server/src/services/extractor.ts`:**

Track whether Diffbot has hit a 429 during this process lifetime. On 429, log a warning and switch to PipFeed for subsequent calls:

```typescript
let diffbotQuotaExhausted = false

async function extractByDiffbot(url: string): Promise<ExtractionResult | null> {
  if (diffbotQuotaExhausted) return null
  const token = process.env.DIFFBOT_TOKEN
  if (!token) return null

  // ...existing logic...
  } catch (err) {
    if (isQuotaError(err)) {
      diffbotQuotaExhausted = true
      log.warn('Diffbot quota exhausted, falling back to PipFeed for remaining extractions')
    }
    log.warn({ url, reason: summarizeError(err) }, 'Diffbot extraction failed')
    return null
  }
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof Error && 'isAxiosError' in err) {
    const status = (err as any).response?.status
    return status === 429
  }
  return false
}
```

The `diffbotQuotaExhausted` flag persists for the process lifetime — it resets on server restart. This is acceptable because the 429 is per-minute, and the flag being sticky just means the current crawl cycle finishes with PipFeed. The next crawl cycle (after server restart or a new crawl run) will try Diffbot again.

**Alternative**: reset the flag after 60 seconds for more granular recovery. Worth considering but adds complexity.

### 5. Update `ExtractionResult` type

**`server/src/services/extractor.ts`:**

```typescript
method: 'selector' | 'readability' | 'diffbot' | 'pipfeed'
```

Both methods coexist.

### 6. Update `extractContent` fallback chain

**`server/src/services/extractor.ts`:**

```typescript
// Tier 3: External API fallback
const preferred = config.crawl.extractionApi
const fallback = preferred === 'diffbot' ? 'pipfeed' : 'diffbot'

const preferredResult = await extractByApi(url, preferred)
if (preferredResult) return preferredResult

// If preferred failed, try the other service
const fallbackResult = await extractByApi(url, fallback)
if (fallbackResult) return fallbackResult
```

With a dispatcher:

```typescript
async function extractByApi(
  url: string,
  api: 'diffbot' | 'pipfeed'
): Promise<ExtractionResult | null> {
  return api === 'diffbot' ? extractByDiffbot(url) : extractByPipfeed(url)
}
```

This means tier 3 is now: try preferred API → if it fails, try the other. When Diffbot is preferred and hits quota, it returns null immediately (via the `diffbotQuotaExhausted` flag), and PipFeed picks up.

### 7. Move PipFeed timeout to config

**`server/src/services/extractor.ts`:**

Change the hardcoded `15000` in `extractByPipfeed` to `config.crawl.pipfeedTimeoutMs`.

### 8. Update tests

**`server/src/services/extractor.test.ts`:**

Existing PipFeed tests remain. Add new tests:

- Diffbot extraction succeeds with valid `objects[0]` response
- Diffbot skipped when no `DIFFBOT_TOKEN`
- Diffbot returns null on insufficient content
- Diffbot returns null on API error
- `datePublished` falls back to `estimatedDate` when `date` is absent
- Quota exhaustion (429): Diffbot returns null, subsequent calls skip Diffbot
- Fallback chain: when preferred=diffbot and it fails, PipFeed is tried
- Fallback chain: when preferred=pipfeed and it fails, Diffbot is tried
- Config `extractionApi` controls which service is tried first

### 9. Environment variables

| Variable | Default | Notes |
|---|---|---|
| `EXTRACTION_API` | `'diffbot'` | `'diffbot'` or `'pipfeed'` — preferred tier 3 service |
| `DIFFBOT_TOKEN` | — | Diffbot API token (required for Diffbot) |
| `DIFFBOT_TIMEOUT_MS` | `15000` | Diffbot request timeout |
| `DIFFBOT_RATE_LIMIT` | `5` | Max Diffbot calls/minute |
| `PIPFEED_API_KEY` | — | PipFeed RapidAPI key (kept, required for PipFeed) |
| `PIPFEED_TIMEOUT_MS` | `15000` | PipFeed request timeout (was hardcoded) |

## Files Changed

- `server/src/services/extractor.ts` — add Diffbot function, rate limiter, quota fallback, API dispatcher
- `server/src/services/extractor.test.ts` — add Diffbot tests, fallback tests
- `server/src/config.ts` — add `extractionApi`, `diffbotTimeoutMs`, `diffbotRateLimit`, `pipfeedTimeoutMs`
- `.context/content-extraction.md` — update documentation

## Out of Scope

- Using Diffbot's richer metadata (author, tags, sentiment, images) beyond title/content/date — future enhancement to enrich Story records
- Bulk extract API (not available on free tier)
- Diffbot's Natural Language processing features
- Per-feed API selection (global setting only)

## Testing

- Unit test: Diffbot extraction succeeds with valid response
- Unit test: Diffbot skipped when no `DIFFBOT_TOKEN`
- Unit test: Diffbot returns null on insufficient content
- Unit test: Diffbot returns null on API error
- Unit test: `datePublished` falls back to `estimatedDate`
- Unit test: Rate limiter prevents >5 calls/minute
- Unit test: 429 sets `diffbotQuotaExhausted` flag, subsequent calls skip Diffbot
- Unit test: Quota exhaustion triggers PipFeed fallback with log warning
- Unit test: `extractionApi=diffbot` tries Diffbot first, then PipFeed
- Unit test: `extractionApi=pipfeed` tries PipFeed first, then Diffbot
- Unit test: Both services absent (no tokens) → returns null
