/**
 * All routes with sitemap metadata.
 * Used by React Router, prerenderer, and sitemap generation.
 *
 * When adding a new page:
 * 1. Add route config here (path, priority, changefreq)
 * 2. Create page component in src/pages/
 * 3. Add route in App.tsx
 * 4. Rebuild to generate static HTML and updated sitemap
 */

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface RouteConfig {
  path: string
  priority: number
  changefreq: ChangeFreq
}

export const routes: RouteConfig[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/issues', priority: 0.8, changefreq: 'monthly' },
  { path: '/issues/existential-threats', priority: 0.8, changefreq: 'weekly' },
  { path: '/issues/planet-climate', priority: 0.8, changefreq: 'weekly' },
  { path: '/issues/human-development', priority: 0.8, changefreq: 'weekly' },
  { path: '/issues/science-technology', priority: 0.8, changefreq: 'weekly' },
  { path: '/methodology', priority: 0.7, changefreq: 'monthly' },
  { path: '/about', priority: 0.7, changefreq: 'monthly' },
  { path: '/imprint', priority: 0.5, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.5, changefreq: 'yearly' },
  { path: '/search', priority: 0.3, changefreq: 'daily' },
  { path: '/developers', priority: 0.5, changefreq: 'monthly' },
  { path: '/widgets', priority: 0.5, changefreq: 'monthly' },
  { path: '/compare', priority: 0.7, changefreq: 'monthly' },
  { path: '/no-ads-no-tracking', priority: 0.7, changefreq: 'monthly' },
  { path: '/news-fatigue', priority: 0.7, changefreq: 'monthly' },
  { path: '/free-api', priority: 0.7, changefreq: 'monthly' },
  { path: '/newsletter', priority: 0.7, changefreq: 'monthly' },
  { path: '/feedback', priority: 0.5, changefreq: 'yearly' },
  { path: '/thank-you', priority: 0.3, changefreq: 'yearly' },
  { path: '/saved', priority: 0.2, changefreq: 'yearly' },
  { path: '/subscribed', priority: 0.2, changefreq: 'yearly' },
  // Dynamic story routes are added at build time by generate-sitemap.ts
  // which fetches published story slugs from the API
]

export const routePaths = routes.map((r) => r.path)

export type Route = (typeof routePaths)[number]
