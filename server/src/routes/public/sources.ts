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

// ---------------------------------------------------------------------------
// GET /sources/profiles — rich per-feed quality stats for /fuentes page
// ---------------------------------------------------------------------------

const PROFILES_TTL = 2 * 60 * 60 * 1000 // 2 hours
const profilesCache = new TTLCache<unknown>(PROFILES_TTL)

interface SourceProfile {
  id: string
  title: string
  displayTitle: string | null
  url: string | null
  language: string
  region: string | null
  regionLabel: string | null
  issueName: string | null
  issueSlug: string | null
  avgRelevance: number | null   // avg of published stories last 90 days
  storyCount: number            // published stories last 90 days
  lastPublishedAt: string | null
}

router.get('/profiles', async (_req, res) => {
  try {
    const data = await cached(profilesCache, 'source-profiles', async (): Promise<SourceProfile[]> => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

      // Aggregate per feed: avg relevance, count, last published — single query
      const stats = await prisma.story.groupBy({
        by: ['feedId'],
        where: {
          status: 'published',
          datePublished: { gte: ninetyDaysAgo },
        },
        _avg: { relevance: true },
        _count: { id: true },
        _max: { datePublished: true },
      })

      const statsMap = new Map(stats.map((s) => [s.feedId, s]))

      const feeds = await prisma.feed.findMany({
        where: { active: true },
        include: {
          issue: { select: { name: true, slug: true } },
        },
        orderBy: { title: 'asc' },
      })

      const result: SourceProfile[] = feeds.map((feed) => {
        const s = statsMap.get(feed.id)
        const avgRaw = s?._avg?.relevance ?? null
        const region = feed.region ?? null
        return {
          id: feed.id,
          title: feed.title,
          displayTitle: feed.displayTitle,
          url: feed.url,
          language: feed.language,
          region,
          regionLabel: region ? (REGION_LABELS[region] ?? region) : null,
          issueName: feed.issue.name,
          issueSlug: feed.issue.slug,
          avgRelevance: avgRaw !== null ? Math.round(avgRaw * 10) / 10 : null,
          storyCount: s?._count?.id ?? 0,
          lastPublishedAt: s?._max?.datePublished?.toISOString() ?? null,
        }
      })

      // Feeds with recent activity first, then by avg relevance
      result.sort((a, b) => {
        if (a.storyCount === 0 && b.storyCount > 0) return 1
        if (b.storyCount === 0 && a.storyCount > 0) return -1
        return (b.avgRelevance ?? 0) - (a.avgRelevance ?? 0)
      })

      log.info({ count: result.length }, 'generated source profiles')
      return result
    })

    res.setHeader('Cache-Control', 'public, max-age=7200')
    res.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ err: msg }, 'source profiles endpoint failed')
    res.status(500).json({ error: 'Failed to load source profiles' })
  }
})

export default router
