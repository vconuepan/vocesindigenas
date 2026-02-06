import prisma from '../lib/prisma.js'
import { type Story, type Prisma, StoryStatus, EmotionTag } from '@prisma/client'
import { paginate } from '../lib/paginate.js'
import { slugify } from '../utils/slugify.js'
import { normalizeUrl } from '../utils/urlNormalization.js'

interface StoryFilters {
  status?: string
  issueId?: string
  feedId?: string
  crawledAfter?: string
  crawledBefore?: string
  ratingMin?: number
  ratingMax?: number
  rating?: string
  emotionTag?: string
  search?: string
  sort?: string
  page?: number
  pageSize?: number
}

const SORT_MAP: Record<string, Prisma.StoryOrderByWithRelationInput> = {
  rating_asc: { relevance: 'asc' },
  rating_desc: { relevance: 'desc' },
  date_asc: { dateCrawled: 'asc' },
  date_desc: { dateCrawled: 'desc' },
  title_asc: { title: 'asc' },
  title_desc: { title: 'desc' },
}

export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title)
  let candidate = base
  let suffix = 2

  while (true) {
    const existing = await prisma.story.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix++
  }
}

function buildWhereClause(filters: StoryFilters): Prisma.StoryWhereInput {
  const where: Prisma.StoryWhereInput = {}
  const conditions: Prisma.StoryWhereInput[] = []

  if (filters.status === 'all') {
    // No status filter — show everything including trashed
  } else if (filters.status) {
    where.status = filters.status as StoryStatus
  } else {
    where.status = { not: StoryStatus.trashed }
  }
  if (filters.feedId) {
    where.feedId = filters.feedId
  }
  if (filters.issueId) {
    conditions.push({
      OR: [
        { issueId: filters.issueId },
        { issue: { parentId: filters.issueId } },
        {
          issueId: null,
          feed: { issue: { OR: [{ id: filters.issueId }, { parentId: filters.issueId }] } },
        },
      ],
    })
  }
  if (filters.crawledAfter || filters.crawledBefore) {
    where.dateCrawled = {}
    if (filters.crawledAfter) where.dateCrawled.gte = new Date(filters.crawledAfter)
    if (filters.crawledBefore) where.dateCrawled.lte = new Date(filters.crawledBefore)
  }
  if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
    where.relevance = {}
    if (filters.ratingMin !== undefined) where.relevance.gte = filters.ratingMin
    if (filters.ratingMax !== undefined) where.relevance.lte = filters.ratingMax
  }
  if (filters.rating) {
    const match = filters.rating.match(/^(gte|lte)(\d+)$/)
    if (match) {
      const op = match[1] as 'gte' | 'lte'
      const val = parseInt(match[2], 10)
      const condition = { [op]: val }
      conditions.push({
        OR: [
          { relevance: condition },
          { relevance: null, relevancePre: condition },
        ],
      })
    }
  }
  if (filters.emotionTag) {
    where.emotionTag = filters.emotionTag as EmotionTag
  }
  if (filters.search) {
    conditions.push({
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' as const } },
        { sourceTitle: { contains: filters.search, mode: 'insensitive' as const } },
        { summary: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    })
  }

  if (conditions.length > 0) {
    where.AND = conditions
  }

  return where
}

const ADMIN_LIST_SELECT = {
  id: true,
  sourceUrl: true,
  sourceTitle: true,
  sourceDatePublished: true,
  feedId: true,
  status: true,
  dateCrawled: true,
  datePublished: true,
  relevancePre: true,
  relevance: true,
  emotionTag: true,
  slug: true,
  title: true,
  titleLabel: true,
  summary: true,
  quote: true,
  quoteAttribution: true,
  marketingBlurb: true,
  relevanceReasons: true,
  antifactors: true,
  relevanceCalculation: true,
  issueId: true,
  issue: { select: { id: true, name: true, slug: true } },
  crawlMethod: true,
  createdAt: true,
  updatedAt: true,
  feed: { select: { id: true, title: true, issue: { select: { id: true, name: true, slug: true } } } },
} as const

export async function getStories(filters: StoryFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const where = buildWhereClause(filters)
  const orderBy = filters.sort ? SORT_MAP[filters.sort] : { dateCrawled: 'desc' as const }

  return paginate({
    findMany: () =>
      prisma.story.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: ADMIN_LIST_SELECT,
      }),
    count: () => prisma.story.count({ where }),
    page,
    pageSize,
  })
}

export async function getStoriesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return prisma.story.findMany({
    where: { id: { in: ids } },
    select: {
      ...ADMIN_LIST_SELECT,
      issue: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      feed: {
        select: {
          id: true,
          title: true,
          issue: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              parent: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  })
}

export async function getStoryById(id: string) {
  return prisma.story.findUnique({
    where: { id },
    include: { issue: true, feed: { include: { issue: true } } },
  })
}

export async function createStory(data: {
  sourceUrl: string
  sourceTitle: string
  sourceContent: string
  feedId: string
  sourceDatePublished?: string
}): Promise<Story> {
  const feed = await prisma.feed.findUnique({ where: { id: data.feedId } })
  if (!feed) {
    throw new Error('Feed not found')
  }
  return prisma.story.create({
    data: {
      sourceUrl: data.sourceUrl,
      sourceTitle: data.sourceTitle,
      sourceContent: data.sourceContent,
      feedId: data.feedId,
      sourceDatePublished: data.sourceDatePublished ? new Date(data.sourceDatePublished) : null,
    },
  })
}

export async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set()
  const normalized = urls.map(normalizeUrl)
  const existing = await prisma.story.findMany({
    where: { sourceUrl: { in: normalized } },
    select: { sourceUrl: true },
  })
  return new Set(existing.map(s => s.sourceUrl))
}

async function preparePublishData(id: string): Promise<Record<string, any>> {
  const story = await prisma.story.findUnique({
    where: { id },
    select: { datePublished: true, slug: true, title: true, sourceTitle: true },
  })
  if (!story) return {}
  const data: Record<string, any> = {}
  if (!story.datePublished) data.datePublished = new Date()
  if (!story.slug) data.slug = await generateUniqueSlug(story.title || story.sourceTitle, id)
  return data
}

export async function updateStory(id: string, data: Record<string, any>): Promise<Story> {
  const updateData = { ...data }
  // Convert date strings to Date objects if present
  if (updateData.sourceDatePublished !== undefined) {
    updateData.sourceDatePublished = updateData.sourceDatePublished ? new Date(updateData.sourceDatePublished) : null
  }
  if (updateData.datePublished !== undefined) {
    updateData.datePublished = updateData.datePublished ? new Date(updateData.datePublished) : null
  }
  // Auto-set datePublished and slug when status changes to published
  if (updateData.status === 'published' && updateData.datePublished === undefined) {
    const publishData = await preparePublishData(id)
    if (!updateData.slug && publishData.slug) updateData.slug = publishData.slug
    if (publishData.datePublished) updateData.datePublished = publishData.datePublished
  }
  return prisma.story.update({ where: { id }, data: updateData })
}

export async function updateStoryStatus(id: string, status: string): Promise<Story> {
  const data: Record<string, any> = { status: status as StoryStatus }
  if (status === 'published') {
    Object.assign(data, await preparePublishData(id))
  }
  return prisma.story.update({ where: { id }, data })
}

export async function generateUniqueSlugs(
  stories: { id: string; title: string | null; sourceTitle: string }[],
): Promise<Map<string, string>> {
  if (stories.length === 0) return new Map()

  // Generate base slugs for all stories
  const baseSlugs = stories.map(s => ({
    id: s.id,
    base: slugify(s.title || s.sourceTitle),
  }))

  // Find all existing slugs that could conflict (matching any base pattern)
  const uniqueBases = [...new Set(baseSlugs.map(s => s.base))]
  const existingStories = await prisma.story.findMany({
    where: {
      slug: { not: null },
      id: { notIn: stories.map(s => s.id) },
      OR: uniqueBases.map(base => ({
        slug: { startsWith: base },
      })),
    },
    select: { slug: true },
  })
  const existingSlugs = new Set(existingStories.map(s => s.slug!))

  // Resolve conflicts: track slugs we're assigning in this batch too
  const assignedSlugs = new Set<string>()
  const result = new Map<string, string>()

  for (const { id, base } of baseSlugs) {
    let candidate = base
    let suffix = 2
    while (existingSlugs.has(candidate) || assignedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix++
    }
    assignedSlugs.add(candidate)
    result.set(id, candidate)
  }

  return result
}

export async function bulkUpdateStatus(ids: string[], status: string) {
  if (status === 'published') {
    // Batch-generate slugs for stories that don't have them yet
    const storiesNeedingSlugs = await prisma.story.findMany({
      where: { id: { in: ids }, slug: null },
      select: { id: true, title: true, sourceTitle: true },
    })

    const slugMap = await generateUniqueSlugs(storiesNeedingSlugs)

    // Apply slug updates + status updates in a transaction
    const now = new Date()
    await prisma.$transaction([
      // Set slugs for stories that need them
      ...Array.from(slugMap.entries()).map(([storyId, slug]) =>
        prisma.story.update({ where: { id: storyId }, data: { slug } }),
      ),
      // Update status for stories that already have datePublished
      prisma.story.updateMany({
        where: { id: { in: ids }, datePublished: { not: null } },
        data: { status: status as StoryStatus },
      }),
      // Update status + set datePublished for stories without one
      prisma.story.updateMany({
        where: { id: { in: ids }, datePublished: null },
        data: { status: status as StoryStatus, datePublished: now },
      }),
    ])

    return { count: ids.length }
  }
  return prisma.story.updateMany({
    where: { id: { in: ids } },
    data: { status: status as StoryStatus },
  })
}

export async function deleteStory(id: string): Promise<void> {
  await prisma.story.delete({ where: { id } })

  // Clean up dangling storyId references in newsletters and podcasts
  const [newsletters, podcasts] = await Promise.all([
    prisma.newsletter.findMany({ where: { storyIds: { has: id } }, select: { id: true, storyIds: true } }),
    prisma.podcast.findMany({ where: { storyIds: { has: id } }, select: { id: true, storyIds: true } }),
  ])

  const updates: Promise<unknown>[] = []
  for (const nl of newsletters) {
    updates.push(prisma.newsletter.update({
      where: { id: nl.id },
      data: { storyIds: nl.storyIds.filter(sid => sid !== id) },
    }))
  }
  for (const pod of podcasts) {
    updates.push(prisma.podcast.update({
      where: { id: pod.id },
      data: { storyIds: pod.storyIds.filter(sid => sid !== id) },
    }))
  }
  if (updates.length > 0) await Promise.all(updates)
}

export async function getStoryStats() {
  const stats = await prisma.story.groupBy({
    by: ['status'],
    _count: { status: true },
  })
  return stats.reduce((acc, row) => {
    acc[row.status] = row._count.status
    return acc
  }, {} as Record<string, number>)
}

// Public endpoints — limited fields, only published stories

const PUBLIC_STORY_SELECT = {
  id: true,
  slug: true,
  sourceUrl: true,
  sourceTitle: true,
  title: true,
  titleLabel: true,
  dateCrawled: true,
  datePublished: true,
  status: true,
  relevancePre: true,
  relevance: true,
  emotionTag: true,
  summary: true,
  quote: true,
  quoteAttribution: true,
  marketingBlurb: true,
  relevanceReasons: true,
  relevanceSummary: true,
  antifactors: true,
  issue: {
    select: { name: true, slug: true },
  },
  feed: {
    select: {
      id: true,
      title: true,
      displayTitle: true,
      issue: {
        select: { name: true, slug: true },
      },
    },
  },
} as const

export async function getPublishedStories(options: {
  page?: number
  pageSize?: number
  issueSlug?: string
  search?: string
}) {
  const page = options.page || 1
  const pageSize = options.pageSize || 25
  const conditions: Prisma.StoryWhereInput[] = []
  if (options.issueSlug) {
    conditions.push({
      OR: [
        {
          issue: {
            OR: [
              { slug: options.issueSlug },
              { parent: { slug: options.issueSlug } },
            ],
          },
        },
        {
          issue: null,
          feed: {
            issue: {
              OR: [
                { slug: options.issueSlug },
                { parent: { slug: options.issueSlug } },
              ],
            },
          },
        },
      ],
    })
  }
  if (options.search) {
    conditions.push({
      OR: [
        { title: { contains: options.search, mode: 'insensitive' } },
        { summary: { contains: options.search, mode: 'insensitive' } },
      ],
    })
  }

  const orderBy: Prisma.StoryOrderByWithRelationInput[] = [{ datePublished: 'desc' }, { dateCrawled: 'desc' }]

  const where: Prisma.StoryWhereInput = {
    status: 'published',
    ...(conditions.length > 0 && { AND: conditions }),
  }

  return paginate({
    findMany: () =>
      prisma.story.findMany({
        where,
        select: PUBLIC_STORY_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    count: () => prisma.story.count({ where }),
    page,
    pageSize,
  })
}

interface StatusFilterOptions {
  ratingMin?: number
  relevanceMin?: number
  hoursAgo?: number
  limit?: number
}

function buildStatusWhereClause(
  status: string,
  options: StatusFilterOptions = {},
): Prisma.StoryWhereInput {
  const where: Prisma.StoryWhereInput = { status: status as StoryStatus }
  if (options.ratingMin !== undefined) {
    where.relevancePre = { gte: options.ratingMin }
  }
  if (options.relevanceMin !== undefined) {
    where.relevance = { gte: options.relevanceMin }
  }
  if (options.hoursAgo !== undefined) {
    where.dateCrawled = { gte: new Date(Date.now() - options.hoursAgo * 60 * 60 * 1000) }
  }
  return where
}

export async function getStoryIdsByStatus(
  status: string,
  options: StatusFilterOptions = {},
): Promise<string[]> {
  const where = buildStatusWhereClause(status, options)
  const stories = await prisma.story.findMany({
    where,
    select: { id: true },
    orderBy: { dateCrawled: 'desc' },
    ...(options.limit ? { take: options.limit } : {}),
  })
  return stories.map(s => s.id)
}

export async function getStoriesByStatus(
  status: string,
  options: StatusFilterOptions = {},
) {
  const where = buildStatusWhereClause(status, options)
  return prisma.story.findMany({
    where,
    include: { feed: { include: { issue: true } } },
    orderBy: { dateCrawled: 'desc' },
    take: options.limit ?? 1000,
  })
}

export async function publishStory(id: string): Promise<Story> {
  const publishData = await preparePublishData(id)
  return prisma.story.update({
    where: { id },
    data: {
      status: StoryStatus.published,
      ...publishData,
    },
  })
}

export async function rejectStory(id: string): Promise<Story> {
  return prisma.story.update({
    where: { id },
    data: { status: StoryStatus.rejected },
  })
}

export async function getPublishedStoryBySlug(slug: string) {
  return prisma.story.findFirst({
    where: { slug, status: 'published' },
    select: PUBLIC_STORY_SELECT,
  })
}

/**
 * Get all data needed for the homepage.
 * Returns stories grouped by issue slug in three emotion buckets:
 * uplifting, calm, and negative (frustrating + scary).
 * Hero is picked client-side from these buckets — no separate queries needed.
 */
const NEGATIVE_EMOTIONS: EmotionTag[] = [EmotionTag.frustrating, EmotionTag.scary]

export async function getHomepageData(issueSlugs: string[], storiesPerIssue = 7) {
  // Build issue slug conditions for stories (includes child issues)
  const buildIssueCondition = (slug: string) => ({
    OR: [
      { issue: { OR: [{ slug }, { parent: { slug } }] } },
      { issue: null, feed: { issue: { OR: [{ slug }, { parent: { slug } }] } } },
    ],
  })

  const orderBy: Prisma.StoryOrderByWithRelationInput[] = [{ datePublished: 'desc' }, { dateCrawled: 'desc' }]

  // Fetch three emotion buckets per issue for client-side mixing.
  // Three buckets allow the client to show uplifting-only at 100% positivity
  // while combining uplifting+calm as "positive" for all other settings.
  const storiesPromises = issueSlugs.map(async (slug) => {
    const baseWhere: Prisma.StoryWhereInput = { status: 'published', ...buildIssueCondition(slug) }

    const [uplifting, calm, negative] = await Promise.all([
      prisma.story.findMany({
        where: { ...baseWhere, emotionTag: EmotionTag.uplifting },
        select: PUBLIC_STORY_SELECT, orderBy, take: storiesPerIssue,
      }),
      prisma.story.findMany({
        where: { ...baseWhere, emotionTag: EmotionTag.calm },
        select: PUBLIC_STORY_SELECT, orderBy, take: storiesPerIssue,
      }),
      prisma.story.findMany({
        where: { ...baseWhere, emotionTag: { in: NEGATIVE_EMOTIONS } },
        select: PUBLIC_STORY_SELECT, orderBy, take: storiesPerIssue,
      }),
    ])

    return { slug, uplifting, calm, negative }
  })

  const issueResults = await Promise.all(storiesPromises)

  const storiesByIssue: Record<string, { uplifting: unknown[]; calm: unknown[]; negative: unknown[] }> = {}
  for (const { slug, uplifting, calm, negative } of issueResults) {
    storiesByIssue[slug] = { uplifting, calm, negative }
  }

  return { storiesByIssue }
}
