import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import prisma from '../../lib/prisma.js'
import { StoryStatus } from '@prisma/client'
import { config } from '../../config.js'

const router = Router()
const log = createLogger('public:communities')

const PUBLIC_STORY_SELECT = {
  id: true,
  slug: true,
  sourceUrl: true,
  sourceTitle: true,
  title: true,
  titleLabel: true,
  datePublished: true,
  relevance: true,
  emotionTag: true,
  summary: true,
  quote: true,
  quoteAttribution: true,
  marketingBlurb: true,
  relevanceSummary: true,
  imageUrl: true,
  titleEn: true,
  titleLabelEn: true,
  summaryEn: true,
  quoteEn: true,
  marketingBlurbEn: true,
  relevanceSummaryEn: true,
  clusterId: true,
  issue: { select: { name: true, slug: true } },
  feed: {
    select: {
      id: true,
      title: true,
      displayTitle: true,
      issue: { select: { name: true, slug: true } },
    },
  },
}

// GET /api/communities — list all communities
router.get('/', async (_req, res) => {
  try {
    const communities = await prisma.community.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    res.set('Cache-Control', 'public, max-age=300')
    res.json(communities)
  } catch (err) {
    log.error({ err }, 'failed to fetch communities')
    res.status(500).json({ error: 'Failed to fetch communities' })
  }
})

// GET /api/communities/:slug — single community metadata
router.get('/:slug', async (req, res) => {
  try {
    const community = await prisma.community.findUnique({
      where: { slug: req.params.slug },
    })
    if (!community) {
      res.status(404).json({ error: 'Community not found' })
      return
    }
    res.set('Cache-Control', 'public, max-age=300')
    res.json(community)
  } catch (err) {
    log.error({ err, slug: req.params.slug }, 'failed to fetch community')
    res.status(500).json({ error: 'Failed to fetch community' })
  }
})

// GET /api/communities/:slug/stories?page=1&pageSize=20
router.get('/:slug/stories', async (req, res) => {
  try {
    const community = await prisma.community.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, issueIds: true },
    })
    if (!community) {
      res.status(404).json({ error: 'Community not found' })
      return
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20))
    const minRelevance = 3

    const where = {
      status: StoryStatus.published,
      issueId: { in: community.issueIds },
      relevance: { gte: minRelevance },
    }

    const [total, stories] = await Promise.all([
      prisma.story.count({ where }),
      prisma.story.findMany({
        where,
        select: PUBLIC_STORY_SELECT,
        orderBy: { datePublished: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    res.set('Cache-Control', 'public, max-age=60')
    res.json({
      data: stories,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    log.error({ err, slug: req.params.slug }, 'failed to fetch community stories')
    res.status(500).json({ error: 'Failed to fetch community stories' })
  }
})

export default router
