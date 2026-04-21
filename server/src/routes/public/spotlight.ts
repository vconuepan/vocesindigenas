/**
 * Public spotlight endpoint — returns the active "En Foco" topic
 * and a set of matching stories for the homepage rotating band.
 *
 * Selection logic:
 *  1. Find the first spotlight where isActive = true AND (startsAt IS NULL OR
 *     startsAt <= now) AND (endsAt IS NULL OR endsAt >= now).
 *  2. Run OR-matched ILIKE query on story title + summary across all keywords.
 *  3. Return up to 8 most recent published stories.
 *
 * Cache: 2 minutes (content updates less frequently than the main homepage).
 */
import { Router } from 'express'
import prisma from '../../lib/prisma.js'
import { createLogger } from '../../lib/logger.js'
import { TTLCache, cached } from '../../lib/cache.js'

const router = Router()
const log = createLogger('public:spotlight')

const SPOTLIGHT_TTL = 2 * 60 * 1000 // 2 minutes
const spotlightCache = new TTLCache<unknown>(SPOTLIGHT_TTL)

router.get('/', async (_req, res) => {
  try {
    const data = await cached(spotlightCache, 'active-spotlight', async () => {
      const now = new Date()

      // Find the first currently-active spotlight
      const spotlight = await prisma.spotlight.findFirst({
        where: {
          isActive: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: now } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!spotlight || spotlight.keywords.length === 0) {
        return null
      }

      // Match stories whose title or summary contains any keyword (case-insensitive)
      const keywordConditions = spotlight.keywords.flatMap((kw: string) => [
        { title:   { contains: kw, mode: 'insensitive' as const } },
        { summary: { contains: kw, mode: 'insensitive' as const } },
      ])

      const stories = await prisma.story.findMany({
        where: {
          status: 'published',
          slug:   { not: null },
          OR: keywordConditions,
        },
        select: {
          slug:        true,
          title:       true,
          titleLabel:  true,
          imageUrl:    true,
          datePublished: true,
          issue: { select: { name: true, slug: true } },
          feed:  { select: { title: true, displayTitle: true } },
        },
        orderBy: { datePublished: 'desc' },
        take: 8,
      })

      return {
        spotlight: {
          id:       spotlight.id,
          label:    spotlight.label,
          startsAt: spotlight.startsAt,
          endsAt:   spotlight.endsAt,
        },
        stories: stories.map(s => ({
          slug:          s.slug,
          title:         s.title,
          titleLabel:    s.titleLabel,
          imageUrl:      s.imageUrl ?? null,
          datePublished: s.datePublished,
          issue:         s.issue ?? null,
          source:        s.feed?.displayTitle ?? s.feed?.title ?? null,
        })),
      }
    })

    res.set('Cache-Control', 'public, max-age=120')
    res.json(data ?? null)
  } catch (err) {
    log.error({ err }, 'failed to fetch spotlight')
    res.status(500).json({ error: 'Failed to fetch spotlight' })
  }
})

export default router
