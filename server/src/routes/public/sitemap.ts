import { Router } from 'express'
import { config } from '../../config.js'
import { createLogger } from '../../lib/logger.js'
import { TTLCache, cached } from '../../lib/cache.js'
import prisma from '../../lib/prisma.js'

const router = Router()
const log = createLogger('sitemap')

export const sitemapCache = new TTLCache<string>(config.sitemap.cacheMaxAge * 1000)

function getSiteUrl(): string {
  return process.env.FRONTEND_URL || 'https://actuallyrelevant.news'
}

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

// Duplicated from client/src/routes.ts — server shouldn't import from client.
// When adding a new page, update both files.
const STATIC_ROUTES: { path: string; priority: number; changefreq: ChangeFreq }[] = [
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
  { path: '/subscribed', priority: 0.2, changefreq: 'yearly' },
]

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function buildSitemapXml(baseUrl: string, stories: { slug: string; datePublished: Date | null }[]): string {
  const staticUrls = STATIC_ROUTES.map(
    (route) => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
  )

  const storyUrls = stories.map((story) => {
    const lastmod = story.datePublished ? `\n    <lastmod>${formatDate(story.datePublished)}</lastmod>` : ''
    return `  <url>
    <loc>${baseUrl}/stories/${story.slug}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...storyUrls].join('\n')}
</urlset>
`
}

router.get('/', async (_req, res) => {
  try {
    const xml = await cached(sitemapCache, 'sitemap', async () => {
      const stories = await prisma.story.findMany({
        where: { status: 'published', slug: { not: null } },
        select: { slug: true, datePublished: true },
        orderBy: { datePublished: 'desc' },
      })

      log.info({ storyCount: stories.length }, 'generated sitemap')
      return buildSitemapXml(getSiteUrl(), stories as { slug: string; datePublished: Date | null }[])
    })

    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.set('Cache-Control', `public, max-age=${config.sitemap.cacheMaxAge}`)
    res.send(xml)
  } catch (err) {
    log.error({ err }, 'failed to generate sitemap')
    res.status(500).json({ error: 'Failed to generate sitemap' })
  }
})

export default router
