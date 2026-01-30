/**
 * Generates sitemap.xml from routes.ts + published story slugs from the API.
 *
 * Run manually: npm run sitemap:generate
 * Runs automatically: as part of npm run build
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { routes, type RouteConfig } from '../src/routes.js'
import { generateSitemapXml } from '../src/lib/sitemap.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://actuallyrelevant.news'
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

interface PaginatedResponse {
  data: { slug: string }[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function fetchStorySlugs(): Promise<string[]> {
  const slugs: string[] = []
  let page = 1
  const pageSize = 100

  try {
    while (true) {
      const res = await fetch(`${API_URL}/api/stories?page=${page}&pageSize=${pageSize}`)
      if (!res.ok) throw new Error(`API returned ${res.status}`)

      const data: PaginatedResponse = await res.json()
      for (const story of data.data) {
        if (story.slug) slugs.push(story.slug)
      }

      if (page >= data.totalPages) break
      page++
    }
  } catch (err) {
    console.warn(`Could not fetch story slugs from API (${API_URL}): ${err instanceof Error ? err.message : err}`)
    console.warn('Sitemap will only contain static routes.')
    return []
  }

  return slugs
}

async function main() {
  const storySlugs = await fetchStorySlugs()

  const storyRoutes: RouteConfig[] = storySlugs.map((slug) => ({
    path: `/stories/${slug}`,
    priority: 0.6,
    changefreq: 'monthly',
  }))

  const allRoutes = [...routes, ...storyRoutes]
  const sitemap = generateSitemapXml(allRoutes, BASE_URL)
  const outputPath = resolve(__dirname, '../public/sitemap.xml')

  writeFileSync(outputPath, sitemap, 'utf-8')
  console.log(`Generated sitemap.xml with ${allRoutes.length} URLs (${routes.length} static + ${storyRoutes.length} stories)`)
}

main()
