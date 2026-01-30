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

Generated automatically from `client/src/routes.ts` + published story slugs during build.

### How It Works

1. Static route metadata (path, priority, changefreq) is defined in `routes.ts`
2. `npm run build` runs `sitemap:generate` before building
3. Script reads static routes and fetches published story slugs from the API (`/api/stories`)
4. Story routes are added with priority 0.6 and changefreq `monthly`
5. If the API is unavailable, the script gracefully falls back to static routes only
6. Sitemap is written to `public/sitemap.xml` and copied to `dist/` during build

The API URL defaults to `http://localhost:3001` but can be overridden via the `VITE_API_URL` environment variable.

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
