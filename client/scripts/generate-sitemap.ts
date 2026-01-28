/**
 * Generates sitemap.xml from routes.ts
 *
 * Run manually: npm run sitemap:generate
 * Runs automatically: as part of npm run build
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { routes } from '../src/routes.js'
import { generateSitemapXml } from '../src/lib/sitemap.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://actuallyrelevant.news'

// TODO: In later phases, also fetch published story slugs and issue slugs
// from the database and add them as dynamic routes here.

const sitemap = generateSitemapXml(routes, BASE_URL)
const outputPath = resolve(__dirname, '../public/sitemap.xml')

writeFileSync(outputPath, sitemap, 'utf-8')
console.log(`Generated sitemap.xml with ${routes.length} URLs`)
