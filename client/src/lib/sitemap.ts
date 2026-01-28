import type { RouteConfig } from '../routes'

/**
 * Generates XML sitemap content from route configuration.
 */
export function generateSitemapXml(routes: RouteConfig[], baseUrl: string): string {
  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
