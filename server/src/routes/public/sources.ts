import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { TTLCache, cached } from '../../lib/cache.js'
import { createLogger } from '../../lib/logger.js'
import type { FeedRegion } from '@prisma/client'

const router = Router()
const log = createLogger('public:sources')

const SOURCES_TTL = 5 * 60 * 1000 // 5 minutes
const sourcesCache = new TTLCache<unknown>(SOURCES_TTL)

const REGION_LABELS: Record<FeedRegion, string> = {
  north_america: 'North America',
  western_europe: 'Western Europe',
  eastern_europe: 'Eastern Europe',
  middle_east_north_africa: 'Middle East & North Africa',
  sub_saharan_africa: 'Sub-Saharan Africa',
  south_southeast_asia: 'South & Southeast Asia',
  pacific: 'Pacific',
  latin_america: 'Latin America',
  global: 'Global',
}

interface SourcesResponse {
  byRegion: Record<string, string[]>
  byIssue: Record<string, string[]>
  totalCount: number
}

async function fetchSources(): Promise<SourcesResponse> {
  const feeds = await prisma.feed.findMany({
    where: { active: true },
    select: {
      title: true,
      displayTitle: true,
      region: true,
      issue: { select: { name: true, parent: { select: { name: true } } } },
    },
    orderBy: { title: 'asc' },
  })

  const byRegion: Record<string, string[]> = {}
  const byIssue: Record<string, string[]> = {}

  for (const feed of feeds) {
    const name = feed.displayTitle || feed.title

    // Group by region
    if (feed.region) {
      const regionLabel = REGION_LABELS[feed.region]
      if (!byRegion[regionLabel]) byRegion[regionLabel] = []
      if (!byRegion[regionLabel].includes(name)) {
        byRegion[regionLabel].push(name)
      }
    }

    // Group by top-level issue (parent if sub-issue, otherwise the issue itself)
    const issueName = feed.issue.parent?.name ?? feed.issue.name
    if (!byIssue[issueName]) byIssue[issueName] = []
    if (!byIssue[issueName].includes(name)) {
      byIssue[issueName].push(name)
    }
  }

  return { byRegion, byIssue, totalCount: feeds.length }
}

router.get('/', async (_req, res) => {
  try {
    const sources = await cached(sourcesCache, 'public-sources', fetchSources)
    res.set('Cache-Control', 'public, max-age=300')
    res.json(sources)
  } catch (err) {
    log.error({ err }, 'failed to fetch sources')
    res.status(500).json({ error: 'Failed to fetch sources' })
  }
})

export default router
