# Memory Safety Audit Fixes

Follow-up to the initial OOM fix (commit `f4376dc`). This plan addresses all 11 remaining issues found during the codebase-wide memory audit.

## Fixes

### 1. `server/src/services/extractor.ts` — Diffbot & PipFeed missing maxContentLength

Add `maxContentLength: config.crawl.maxContentLength` to both API axios calls (lines ~190 and ~231). Same 5MB cap already applied to `fetchPage`.

### 2. `server/src/services/analysis.ts` — Loads all stories upfront with full sourceContent

`runBatchClassification` (line 55) loads ALL story IDs at once with `include: { feed: { include: { issue: true } } }`, pulling full `sourceContent` for every story before splitting into batches. For 100+ stories this means hundreds of MB in memory simultaneously.

**Fix:** Load stories per-batch inside the batch loop using `select` to pull only the fields actually used (`id`, `sourceTitle`, `sourceContent`, plus feed issue name for classification context).

### 3. `server/src/services/story.ts` — relatedCache unbounded

`relatedCache` (line 777) is a `Map` with TTL-based expiry but no max size. If many unique story pages are visited, entries accumulate until server restart.

**Fix:** Add a max size constant (e.g. 500 entries). When inserting and at capacity, evict the entry with the earliest expiry. Simple and sufficient since the cache is small per-entry.

### 4. `server/src/services/story.ts` — getStoriesByStatus loads sourceContent

`getStoriesByStatus` (line 927) uses `include` which pulls all fields including large `sourceContent`. Default limit is 1000.

**Fix:** Use `select` to exclude `sourceContent` and `embedding` (the vector field). Select all other fields needed by callers. Check callers to confirm sourceContent is not needed.

### 5. `server/src/services/newsletter.ts` — generateContent loads sourceContent

`generateContent` (line 180) loads stories with `include` pulling `sourceContent`. Newsletter generation only needs title, summary, blurb, URL, issue info.

**Fix:** Replace `include` with `select` specifying only the fields used in the newsletter template.

### 6. `server/src/lib/notify.ts` — webhook POST missing maxContentLength

`axios.post` has `timeout: 5000` but no `maxContentLength`. A malicious/broken webhook endpoint could return a huge response body.

**Fix:** Add `maxContentLength: 1 * 1024 * 1024` (1MB, generous for a webhook response).

### 7. `server/src/services/plunk.ts` — axios client missing maxContentLength

`axios.create` has `timeout: 15000` but no `maxContentLength`.

**Fix:** Add `maxContentLength: 1 * 1024 * 1024` (1MB) to the axios client config.

### 8. `server/src/lib/bluesky.ts` — og:image fetch has no timeout or size limit

`fetch(linkCard.thumbUrl)` at line 123 has no timeout. Downloads full body into memory via `arrayBuffer()` before checking `buffer.length <= 1_000_000`.

**Fix:** Add `AbortSignal.timeout(10_000)` to the fetch call. The existing post-download size check (1MB) is adequate for limiting memory since images shouldn't be huge, but the timeout prevents hanging indefinitely.

### 9. `server/src/services/favicon.ts` — fetchImage downloads full body before size check

`fetchImage` (line 37) fetches with `AbortSignal.timeout(10_000)` but downloads the entire response body before checking against `MAX_FAVICON_BYTES` (100KB).

**Fix:** Read the response body in chunks via `response.body` reader, aborting once `MAX_FAVICON_BYTES` is exceeded. This prevents allocating a huge buffer for an unexpectedly large response.

### 10. `server/src/services/favicon.ts` — tryHtmlParsing has no response size limit

`tryHtmlParsing` (line 64) fetches full HTML pages with `AbortSignal.timeout(10_000)` but no size limit. HTML pages are typically small but could be pathologically large.

**Fix:** Read the response body in chunks, aborting once a max size (e.g. 2MB) is exceeded. We only need the `<head>` section for favicon links.

### 11. General — `maxContentLength` config constant

Multiple fixes reference a shared max content length. For the new 1MB caps on webhook/email responses, use inline constants since they're one-off. For the crawl-related caps (Diffbot, PipFeed), reuse `config.crawl.maxContentLength`.

## Testing

- Add `maxContentLength` assertions to existing extractor tests for Diffbot and PipFeed paths
- Add test for relatedCache eviction at max size
- Add test for analysis.ts per-batch loading (verify no upfront bulk load)
- Verify existing tests still pass

## Files to modify

1. `server/src/services/extractor.ts`
2. `server/src/services/analysis.ts`
3. `server/src/services/story.ts`
4. `server/src/services/newsletter.ts`
5. `server/src/lib/notify.ts`
6. `server/src/services/plunk.ts`
7. `server/src/lib/bluesky.ts`
8. `server/src/services/favicon.ts`
