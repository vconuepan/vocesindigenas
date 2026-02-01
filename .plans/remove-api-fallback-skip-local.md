# Plan: Remove API Fallback Chain + Skip Local Extraction After Repeated Failures

## Change 1: Remove fallback API from extractor

**File:** `server/src/services/extractor.ts` (lines 267-275)

Currently Tier 3 tries the preferred API, then falls back to the other API. Change to only use the configured `config.crawl.extractionApi` — no fallback.

```typescript
// Before (lines 267-275):
const preferred = config.crawl.extractionApi
const fallback = preferred === 'diffbot' ? 'pipfeed' : 'diffbot'
const preferredResult = await extractByApi(url, preferred)
if (preferredResult) return preferredResult
const fallbackResult = await extractByApi(url, fallback)
if (fallbackResult) return fallbackResult

// After:
const apiResult = await extractByApi(url, config.crawl.extractionApi)
if (apiResult) return apiResult
```

Remove the `extractByApi` helper (only needed for the dual-call pattern) and call the right function directly, or keep it — either way, no second API call.

## Change 2: Skip local extraction after N consecutive failures

When the first N articles in a feed all fail local extraction (tier 1 + tier 2) and require the API, skip local extraction for remaining articles to avoid wasting time on HTTP 403s.

### Config addition (`server/src/config.ts`)

```typescript
crawl: {
  ...existing,
  localFailThreshold: parseInt(process.env.LOCAL_FAIL_THRESHOLD || '3', 10),
}
```

### Extractor change (`server/src/services/extractor.ts`)

Add `skipLocalExtraction?: boolean` to the options parameter:

```typescript
export async function extractContent(
  url: string,
  options?: { htmlSelector?: string | null; skipLocalExtraction?: boolean }
): Promise<ExtractionResult | null>
```

When `skipLocalExtraction` is true, skip `fetchPage()`, tier 1, and tier 2 — go straight to the API.

### Crawler change (`server/src/services/crawler.ts`)

Track consecutive local extraction failures in `crawlFeed()`:

```typescript
let localFailCount = 0
let skipLocal = false

// Inside the article loop:
const extracted = await extractContent(item.url, {
  htmlSelector: feed.htmlSelector,
  skipLocalExtraction: skipLocal,
})

// After extraction:
if (extracted) {
  if (extracted.method === 'selector' || extracted.method === 'readability') {
    localFailCount = 0  // reset — local methods work for this feed
  } else {
    localFailCount++
  }
} else {
  localFailCount++
}

if (localFailCount >= config.crawl.localFailThreshold) {
  skipLocal = true
}
```

**Concurrency note:** With `articleSemaphore` = 3, the first 3 articles run concurrently and all attempt local extraction. After they complete, if all 3 failed locally, article 4+ skips local. This is acceptable — the threshold takes effect after the first concurrent batch.

## Change 3: Update tests

### `server/src/services/extractor.test.ts`

- Remove/update tests that verify the fallback API behavior (e.g., "falls back to PipFeed when Diffbot fails")
- Add test: when `skipLocalExtraction: true`, does not call `fetchPage` (mockAxiosGet not called), goes straight to API
- Update "falls back to pipfeed when readability fails" to only test the configured API

### `server/src/services/crawler.test.ts`

- Add test: after N articles fail local extraction (return API method), subsequent articles are called with `skipLocalExtraction: true`
- Add test: if an article succeeds via local extraction, the counter resets

## Change 4: Update context docs

**File:** `.context/content-extraction.md`

Document:
- Only the configured `extractionApi` is used (no fallback to the other API)
- Local extraction skip behavior after N consecutive failures

## Files to modify

| File | Change |
|------|--------|
| `server/src/config.ts` | Add `localFailThreshold` setting |
| `server/src/services/extractor.ts` | Remove fallback API; add `skipLocalExtraction` option |
| `server/src/services/extractor.test.ts` | Update tests for single-API + skip-local behavior |
| `server/src/services/crawler.ts` | Track local fail count, pass `skipLocalExtraction` |
| `server/src/services/crawler.test.ts` | Add tests for local fail threshold logic |
| `.context/content-extraction.md` | Document both changes |

## Verification

1. `npm run build --prefix server` — zero type errors
2. `npm run test --prefix server -- --run` — all tests pass
3. Manual: crawl an Economist feed, observe logs — after 3 articles hit HTTP 403, remaining articles should log "attempting Diffbot extraction" without preceding "page fetch failed"
