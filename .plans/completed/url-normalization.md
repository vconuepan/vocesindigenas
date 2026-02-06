# Plan: URL Normalization for Deduplication

## Goal

Normalize article URLs before deduplication so that variations like trailing slashes, tracking parameters, and scheme differences don't create duplicate stories.

## Current State

- `server/src/services/rssParser.ts` extracts `item.link` as-is from RSS items
- `server/src/services/story.ts` `getExistingUrls()` does exact string matching on `sourceUrl`
- `server/src/utils/urlValidation.ts` validates URLs (blocks private IPs, etc.) but does not normalize them
- No URL normalization anywhere in the pipeline

## Examples of Duplicates This Would Catch

- `https://example.com/article` vs `https://example.com/article/`
- `https://example.com/article?utm_source=rss&utm_medium=feed` vs `https://example.com/article`
- `http://example.com/article` vs `https://example.com/article`
- `https://example.com/Article` vs `https://example.com/article` (path case — controversial, see open questions)

## Changes

### 1. Create URL normalization utility

**`server/src/utils/urlNormalization.ts`:**

```typescript
export function normalizeUrl(url: string): string {
  const parsed = new URL(url)

  // 1. Force HTTPS
  parsed.protocol = 'https:'

  // 2. Lowercase hostname (already done by URL constructor)

  // 3. Remove default port
  parsed.port = ''

  // 4. Remove trailing slash from path (except root "/")
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  // 5. Remove tracking parameters
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'ref', 'source',
  ]
  for (const param of trackingParams) {
    parsed.searchParams.delete(param)
  }

  // 6. Sort remaining query parameters for consistency
  parsed.searchParams.sort()

  // 7. Remove fragment
  parsed.hash = ''

  return parsed.toString()
}
```

### 2. Apply normalization at ingestion

**`server/src/services/rssParser.ts`:**
- Normalize URLs when extracting items from RSS feed: `normalizeUrl(item.link)`

### 3. Apply normalization at deduplication

**`server/src/services/story.ts`:**
- In `getExistingUrls()`, normalize the input URLs before querying

### 4. One-time migration for existing URLs

Existing stories in the database may have un-normalized URLs. Options:

- **Option A: Normalize existing URLs in a migration** — run an UPDATE to normalize all `source_url` values. Risk: could break external links if anyone bookmarked the old URL.
- **Option B: Don't migrate** — only new stories get normalized URLs. Old duplicates remain but no new ones are created.
- **Option C: Dual lookup** — check both normalized and raw URL during dedup. More complex but handles transition period.

## Decisions

- **Paths stay case-sensitive** — don't lowercase paths
- **Fixed tracking param list** (Option A) — utm_*, fbclid, gclid, ref, source
- **Don't migrate existing URLs** (Option B) — only normalize going forward

## Testing

- Unit test: trailing slash removal
- Unit test: tracking parameter removal
- Unit test: scheme normalization (http → https)
- Unit test: fragment removal
- Unit test: query parameter sorting
- Unit test: edge cases (root URL, URLs with meaningful query params)
- Integration test: deduplication catches normalized duplicates
