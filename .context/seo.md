# SEO: Sitemap and Robots

## Files

| File | Location | Type |
|------|----------|------|
| `robots.txt` | `client/public/robots.txt` | Static |
| `sitemap.xml` | `server/src/routes/public/sitemap.ts` | Dynamic (server-generated) |

## robots.txt

Static file that rarely changes. Points crawlers to the sitemap.

```txt
User-agent: *
Allow: /

Sitemap: https://actuallyrelevant.news/sitemap.xml
```

## sitemap.xml

Served dynamically by the backend at `GET /api/sitemap.xml`. In production, a Render rewrite rule proxies `/sitemap.xml` to the backend endpoint so crawlers see it at the canonical URL.

### How It Works

1. `GET /api/sitemap.xml` queries all published stories (slug + datePublished) from the database
2. Combines with hardcoded static routes (same list as `client/src/routes.ts`)
3. Generates XML with `<lastmod>` for stories using `datePublished`
4. Response is cached in-memory (TTL: `config.sitemap.cacheMaxAge`, default 1 hour)
5. `Cache-Control: public, max-age=3600` header allows CDN/proxy caching
6. New stories appear in the sitemap automatically within the cache TTL

### Render Rewrite Rule

| Field | Value |
|-------|-------|
| Source | `/sitemap.xml` |
| Destination | `https://<backend-service>.onrender.com/api/sitemap.xml` |
| Action | **Rewrite** |

**Critical — Rule Order:**
- Render evaluates rewrite rules **top-to-bottom, first match wins**
- The `/sitemap.xml` rule must appear **before** the SPA catch-all rule (`/*` → `/index.html`)
- If reversed, the catch-all matches first and serves the SPA shell, which then 404s on the client

**Important:** No static `sitemap.xml` file should exist in `client/public/` — Render serves static files before applying rewrite rules.

### Configuration

| Config Key | Env Var | Default | Description |
|-----------|---------|---------|-------------|
| `config.sitemap.cacheMaxAge` | `SITEMAP_CACHE_MAX_AGE` | `3600` | Cache TTL in seconds |

### Legacy Build-Time Generation

The build-time sitemap generator (`client/scripts/generate-sitemap.ts`) is kept for local development/testing but is no longer part of the client build command.

## Adding a New Route

When adding a page, add sitemap metadata in **two places**:

1. `client/src/routes.ts` — for prerendering
2. `server/src/routes/public/sitemap.ts` `STATIC_ROUTES` array — for the dynamic sitemap

### Priority Guidelines

| Priority | Use For |
|----------|---------|
| 1.0 | Homepage only |
| 0.8 | Issue pages |
| 0.7 | Important static pages (methodology, about) |
| 0.6 | Individual published stories |
| 0.5 | Utility pages (imprint, privacy) |
| 0.3 | Low-priority pages (search) |
| 0.2 | Non-indexable pages (subscribed confirmation) |

### Change Frequency Options

- `daily` — Homepage, search (new stories published regularly)
- `weekly` — Issue/category pages
- `monthly` — Static pages (methodology, about), individual stories
- `yearly` — Pages that rarely change (imprint, privacy, subscribed)
