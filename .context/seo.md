# SEO: Sitemap and Robots

## Files

| File | Location | Type |
|------|----------|------|
| `robots.txt` | `client/public/robots.txt` | Static |
| `sitemap.xml` | `client/public/sitemap.xml` | Generated |

## robots.txt

Static file that rarely changes. Points crawlers to the sitemap.

```txt
User-agent: *
Allow: /

Sitemap: https://actuallyrelevant.news/sitemap.xml
```

## sitemap.xml

Generated automatically from `client/src/routes.ts` during build.

### How It Works

1. Route metadata (path, priority, changefreq) is defined in `routes.ts`
2. `npm run build` runs `sitemap:generate` before building
3. Script reads routes and generates `public/sitemap.xml`
4. Sitemap is copied to `dist/` during build

In later phases, `generate-sitemap.ts` will also query the database for published story slugs and issue slugs to include as dynamic routes.

### Manual Generation

```bash
npm run sitemap:generate --prefix client
```

## Adding a New Route

When adding a page, include sitemap metadata in `routes.ts`:

```ts
export const routes: RouteConfig[] = [
  // ... existing routes
  { path: '/new-page', priority: 0.7, changefreq: 'monthly' },
]
```

### Priority Guidelines

| Priority | Use For |
|----------|---------|
| 1.0 | Homepage only |
| 0.9 | Core content pages (story listings by issue) |
| 0.8 | Important static pages (methodology, about) |
| 0.7 | Individual published stories |
| 0.6 | Secondary content |
| 0.5 | Utility pages (contact) |

### Change Frequency Options

- `daily` - Homepage, story listings (new stories published regularly)
- `weekly` - Issue/category pages
- `monthly` - Static pages (methodology, about)
- `yearly` - Pages that rarely change (contact)

## Script Location

`client/scripts/generate-sitemap.ts`

The script reads the `BASE_URL` constant (currently `https://actuallyrelevant.news`). If the domain changes, update this constant.
