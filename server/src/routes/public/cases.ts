/**
 * GET /api/public/cases          — list active ongoing cases
 * GET /api/public/cases/:slug    — case detail with matching stories
 *
 * Stories are matched by ILIKE keyword search on title + summary,
 * same mechanism as Spotlight.
 */
import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { TTLCache, cached } from '../../lib/cache.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('public:cases')

const LIST_TTL  = 5 * 60 * 1000  // 5 minutes
const listCache = new TTLCache<unknown>(LIST_TTL)
const caseCache = new TTLCache<unknown>(5 * 60 * 1000)

interface CaseListItem {
  id: string
  title: string
  slug: string
  description: string | null
  imageUrl: string | null
  keywords: string[]
  storyCount: number
}

interface CaseStory {
  slug: string | null
  title: string | null
  imageUrl: string | null
  datePublished: string | null
  issueName: string | null
  issueSlug: string | null
  source: string | null
}

interface CaseDetail {
  id: string
  title: string
  slug: string
  description: string | null
  imageUrl: string | null
  keywords: string[]
  stories: CaseStory[]
}

// List active cases
router.get('/', async (_req, res) => {
  try {
    const data = await cached(listCache, 'cases-list', async (): Promise<CaseListItem[]> => {
      const cases = await prisma.ongoingCase.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
      })

      // For each case, count matching published stories
      const results: CaseListItem[] = await Promise.all(
        cases.map(async (c: { id: string; title: string; slug: string; description: string | null; imageUrl: string | null; keywords: string[] }) => {
          const keywordConditions = c.keywords.flatMap((kw: string) => [
            { title:   { contains: kw, mode: 'insensitive' as const } },
            { summary: { contains: kw, mode: 'insensitive' as const } },
          ])

          const storyCount = c.keywords.length === 0 ? 0 : await prisma.story.count({
            where: {
              status: 'published',
              slug: { not: null },
              OR: keywordConditions,
            },
          })

          return {
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: c.description,
            imageUrl: c.imageUrl,
            keywords: c.keywords,
            storyCount,
          }
        })
      )

      return results
    })

    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ err: msg }, 'failed to list cases')
    res.status(500).json({ error: 'Failed to list cases' })
  }
})

// Case detail with matching stories
router.get('/:slug', async (req, res) => {
  try {
    const cacheKey = `case-${req.params.slug}`
    const data = await cached(caseCache, cacheKey, async (): Promise<CaseDetail | null> => {
      const c = await prisma.ongoingCase.findUnique({
        where: { slug: req.params.slug },
      })

      if (!c || c.status !== 'active') return null

      const keywordConditions = c.keywords.flatMap((kw: string) => [
        { title:   { contains: kw, mode: 'insensitive' as const } },
        { summary: { contains: kw, mode: 'insensitive' as const } },
      ])

      const stories = c.keywords.length === 0 ? [] : await prisma.story.findMany({
        where: {
          status: 'published',
          slug: { not: null },
          OR: keywordConditions,
        },
        select: {
          slug: true,
          title: true,
          imageUrl: true,
          datePublished: true,
          issue: { select: { name: true, slug: true } },
          feed: { select: { title: true, displayTitle: true } },
        },
        orderBy: { datePublished: 'desc' },
        take: 50,
      })

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        keywords: c.keywords,
        stories: stories.map((s) => ({
          slug: s.slug,
          title: s.title,
          imageUrl: s.imageUrl,
          datePublished: s.datePublished?.toISOString() ?? null,
          issueName: s.issue?.name ?? null,
          issueSlug: s.issue?.slug ?? null,
          source: s.feed?.displayTitle ?? s.feed?.title ?? null,
        })),
      }
    })

    if (!data) {
      res.status(404).json({ error: 'Case not found' })
      return
    }

    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ err: msg }, 'failed to get case')
    res.status(500).json({ error: 'Failed to get case' })
  }
})

export default router
