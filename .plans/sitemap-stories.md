# Plan: Dynamic Sitemap with Individual Stories

## Requirements

- Include individual story URLs (`/stories/{slug}`) in the sitemap
- Sitemap must stay up-to-date in production without redeploying the frontend
- New stories published daily should appear automatically
- Sitemap should be served from the main domain (`actuallyrelevant.news/sitemap.xml`)

## Current State

The sitemap is generated **at build time** by `client/scripts/generate-sitemap.ts`:

1. Static routes from `client/src/routes.ts` (12 routes: homepage, issues, about, etc.)
2. Story URLs fetched via `GET /api/stories` (paginated through all published stories)
3. Output written to `client/public/sitemap.xml`
4. Runs as part of `npm run build --prefix client`

The current file has 318 URLs, but only ~50-60 stories are actually published. The build-time script likely ran against a database with more stories at the time of the last deploy. This is a known discrepancy that the new dynamic approach will fix.

## Approach: Server-Generated Sitemap + Render Rewrite

### Architecture

```
Browser/Crawler                   Render Static Site              Backend Server
      │                                 │                               │
      │  GET /sitemap.xml               │                               │
      │────────────────────────────────>│                               │
      │                                 │  Rewrite rule (proxy)         │
      │                                 │  /sitemap.xml ──────────────>│
      │                                 │                  GET /api/sitemap.xml
      │                                 │                               │
      │                                 │          XML response         │
      │                                 │<──────────────────────────────│
      │          XML response           │                               │
      │<────────────────────────────────│                               │
```

### Part 1: Backend Endpoint

Add `GET /api/sitemap.xml` to the public router.

**Implementation details:**

- New file: `server/src/routes/public/sitemap.ts`
- Register in `server/src/routes/public/index.ts` as `router.use('/sitemap.xml', sitemapRouter)`
- Query: fetch all published story slugs from DB (just `slug` and `datePublished` — no heavy joins)
- Combine with hardcoded static routes (same list as `client/src/routes.ts`)
- Generate XML using the same format as the existing `client/src/lib/sitemap.ts`
- Response: `Content-Type: application/xml; charset=utf-8`

**Caching strategy (two layers):**

1. **In-memory TTL cache** — Reuse the existing `TTLCache` from `server/src/lib/cache.ts` (same pattern as RSS feeds). Cache the generated XML string for a configurable duration (default: 1 hour). Config key: `config.sitemap.cacheMaxAge` (seconds), env var: `SITEMAP_CACHE_MAX_AGE`.

2. **HTTP Cache-Control header** — `Cache-Control: public, max-age=3600` (1 hour). This allows Render's proxy and any intermediary CDN to cache the response too, reducing backend hits further.

One hour is a good TTL: stories are published once or twice daily, and search engine crawlers typically re-fetch sitemaps every few hours to days. Freshness within an hour is more than sufficient.

**Static routes** are defined as a const array in the sitemap route file (duplicated from client `routes.ts`). This is intentional — the server shouldn't import from the client package. The list of 12 static routes changes rarely and is easy to keep in sync.

**Story query** — a lightweight Prisma query:

```typescript
prisma.story.findMany({
  where: { status: 'published', slug: { not: null } },
  select: { slug: true, datePublished: true },
  orderBy: { datePublished: 'desc' },
})
```

This avoids the overhead of the full `getPublishedStories` service method (which includes joins for feeds, issues, etc.) and keeps the sitemap endpoint fast even without cache.

### Part 2: Render Rewrite Rule

Render static sites support rewrite rules configured via the Dashboard or API. A rewrite (as opposed to a redirect) proxies the request transparently — the browser/crawler sees the response as coming from the original domain.

**Configuration:**

| Field       | Value |
|-------------|-------|
| Source      | `/sitemap.xml` |
| Destination | `https://<backend-service>.onrender.com/api/sitemap.xml` |
| Action      | **Rewrite** |

**Important caveat:** Render does **not** apply rewrite rules if a file exists at that path. The static `client/public/sitemap.xml` must be **removed** (or excluded from the build) for the rewrite to take effect. Otherwise Render serves the static file and ignores the rule.

**How to set up:**
1. Go to Render Dashboard → Static Site → Redirects/Rewrites
2. Add the rule above
3. No code or config file needed — Render doesn't use `_redirects` files (unlike Netlify)

Alternatively, use the [Render API](https://api-docs.render.com/reference/add-route) to add the rule programmatically.

### Part 3: Cleanup

- **Delete** `client/public/sitemap.xml` (the static file)
- **Remove** the `sitemap:generate` script from `client/package.json` build command
- **Keep** `client/scripts/generate-sitemap.ts` and `client/src/lib/sitemap.ts` for now (can be removed later, or kept for local dev/testing)
- **Update** `robots.txt` — no change needed, it already points to `https://actuallyrelevant.news/sitemap.xml`

### Config Addition

In `server/src/config.ts`, add:

```typescript
sitemap: {
  cacheMaxAge: parseInt(process.env.SITEMAP_CACHE_MAX_AGE || '3600', 10),
},
```

## Implementation Steps

1. ~~Add `config.sitemap.cacheMaxAge` to `server/src/config.ts`~~ ✅
2. ~~Create `server/src/routes/public/sitemap.ts` with the endpoint~~ ✅
3. ~~Register the route in `server/src/routes/public/index.ts`~~ ✅
4. ~~Remove `sitemap:generate` from the client build command in `client/package.json`~~ ✅
5. ~~Delete `client/public/sitemap.xml`~~ ✅
6. ~~Build and test server (`npm run build --prefix server`, `npm run test --prefix server -- --run`)~~ ✅ (498/498 tests pass)
7. Test locally: `curl http://localhost:3001/api/sitemap.xml` should return valid XML with ~60 story URLs + 12 static routes
8. After deploy: configure the Render rewrite rule in the Dashboard (Source: `/sitemap.xml`, Destination: backend URL, Action: Rewrite)
9. ~~Update `.context/seo.md` to document the new dynamic sitemap setup~~ ✅

## Notes

- The `<lastmod>` field will be included for story URLs using `datePublished`, omitted for static routes (since we don't track their modification dates)
- Issue page URLs (`/issues/*`) are already in the static routes list — no need to query issues from the DB
- If the story count grows beyond 50,000 (the sitemap protocol limit), we'd need a sitemap index — but that's far off for this site
