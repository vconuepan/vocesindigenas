import prisma from '../lib/prisma.js'
import type { Story, Prisma } from '@prisma/client'
import { slugify } from '../utils/slugify.js'

interface StoryFilters {
  status?: string
  issueId?: string
  feedId?: string
  crawledAfter?: string
  crawledBefore?: string
  ratingMin?: number
  ratingMax?: number
  emotionTag?: string
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

  if (filters.status === 'all') {
    // No status filter — show everything including trashed
  } else if (filters.status) {
    where.status = filters.status as any
  } else {
    where.status = { not: 'trashed' as any }
  }
  if (filters.feedId) {
    where.feedId = filters.feedId
  }
  if (filters.issueId) {
    where.feed = {
      issue: {
        OR: [
          { id: filters.issueId },
          { parentId: filters.issueId },
        ],
      },
    }
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
  if (filters.emotionTag) {
    where.emotionTag = filters.emotionTag as any
  }

  return where
}

export async function getStories(filters: StoryFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const where = buildWhereClause(filters)
  const orderBy = filters.sort ? SORT_MAP[filters.sort] : { dateCrawled: 'desc' as const }

  const [data, total] = await Promise.all([
    prisma.story.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { feed: { include: { issue: true } } },
    }),
    prisma.story.count({ where }),
  ])

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getStoriesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return prisma.story.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  })
}

export async function getStoryById(id: string) {
  return prisma.story.findUnique({
    where: { id },
    include: { feed: { include: { issue: true } } },
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
  const existing = await prisma.story.findMany({
    where: { sourceUrl: { in: urls } },
    select: { sourceUrl: true },
  })
  return new Set(existing.map(s => s.sourceUrl))
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
  // Auto-set datePublished when status changes to published
  if (updateData.status === 'published' && updateData.datePublished === undefined) {
    const story = await prisma.story.findUnique({ where: { id }, select: { datePublished: true, slug: true, title: true, sourceTitle: true } })
    if (story && !story.datePublished) {
      updateData.datePublished = new Date()
    }
    // Auto-generate slug on publish if not already set
    if (story && !story.slug && !updateData.slug) {
      updateData.slug = await generateUniqueSlug(story.title || story.sourceTitle, id)
    }
  }
  return prisma.story.update({ where: { id }, data: updateData })
}

export async function updateStoryStatus(id: string, status: string): Promise<Story> {
  const data: Record<string, any> = { status: status as any }
  // Auto-set datePublished and slug when status changes to published
  if (status === 'published') {
    const story = await prisma.story.findUnique({ where: { id }, select: { datePublished: true, slug: true, title: true, sourceTitle: true } })
    if (story && !story.datePublished) {
      data.datePublished = new Date()
    }
    if (story && !story.slug) {
      data.slug = await generateUniqueSlug(story.title || story.sourceTitle, id)
    }
  }
  return prisma.story.update({ where: { id }, data })
}

export async function bulkUpdateStatus(ids: string[], status: string) {
  if (status === 'published') {
    // Generate slugs for stories that don't have them yet
    const storiesNeedingSlugs = await prisma.story.findMany({
      where: { id: { in: ids }, slug: null },
      select: { id: true, title: true, sourceTitle: true },
    })
    for (const story of storiesNeedingSlugs) {
      const slug = await generateUniqueSlug(story.title || story.sourceTitle, story.id)
      await prisma.story.update({ where: { id: story.id }, data: { slug } })
    }

    // Auto-set datePublished when bulk-publishing stories that don't have one yet
    const [withDate, withoutDate] = await Promise.all([
      prisma.story.updateMany({
        where: { id: { in: ids }, datePublished: { not: null } },
        data: { status: status as any },
      }),
      prisma.story.updateMany({
        where: { id: { in: ids }, datePublished: null },
        data: { status: status as any, datePublished: new Date() },
      }),
    ])
    return { count: withDate.count + withoutDate.count }
  }
  return prisma.story.updateMany({
    where: { id: { in: ids } },
    data: { status: status as any },
  })
}

export async function deleteStory(id: string): Promise<void> {
  await prisma.story.delete({ where: { id } })
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
  dateCrawled: true,
  datePublished: true,
  status: true,
  relevancePre: true,
  relevance: true,
  emotionTag: true,
  summary: true,
  quote: true,
  marketingBlurb: true,
  relevanceReasons: true,
  antifactors: true,
  feed: {
    select: {
      title: true,
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
}) {
  const page = options.page || 1
  const pageSize = options.pageSize || 25
  const where: Prisma.StoryWhereInput = {
    status: 'published',
  }
  if (options.issueSlug) {
    where.feed = {
      issue: {
        OR: [
          { slug: options.issueSlug },
          { parent: { slug: options.issueSlug } },
        ],
      },
    }
  }

  const [data, total] = await Promise.all([
    prisma.story.findMany({
      where,
      select: PUBLIC_STORY_SELECT,
      orderBy: { dateCrawled: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.story.count({ where }),
  ])

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getStoriesByStatus(
  status: string,
  options: { ratingMin?: number; relevanceMin?: number; hoursAgo?: number } = {},
) {
  const where: Prisma.StoryWhereInput = { status: status as any }
  if (options.ratingMin !== undefined) {
    where.relevancePre = { gte: options.ratingMin }
  }
  if (options.relevanceMin !== undefined) {
    where.relevance = { gte: options.relevanceMin }
  }
  if (options.hoursAgo !== undefined) {
    where.dateCrawled = { gte: new Date(Date.now() - options.hoursAgo * 60 * 60 * 1000) }
  }
  return prisma.story.findMany({
    where,
    include: { feed: { include: { issue: true } } },
    orderBy: { dateCrawled: 'desc' },
  })
}

export async function publishStory(id: string): Promise<Story> {
  const story = await prisma.story.findUnique({ where: { id } })
  const slug = story && !story.slug
    ? await generateUniqueSlug(story.title || story.sourceTitle, id)
    : undefined
  return prisma.story.update({
    where: { id },
    data: {
      status: 'published' as any,
      // Set datePublished only on first publish
      ...(story && !story.datePublished ? { datePublished: new Date() } : {}),
      ...(slug ? { slug } : {}),
    },
  })
}

export async function rejectStory(id: string): Promise<Story> {
  return prisma.story.update({
    where: { id },
    data: { status: 'rejected' as any },
  })
}

export async function getPublishedStoryById(id: string) {
  return prisma.story.findFirst({
    where: { id, status: 'published' },
    select: PUBLIC_STORY_SELECT,
  })
}

export async function getPublishedStoryBySlug(slug: string) {
  return prisma.story.findFirst({
    where: { slug, status: 'published' },
    select: PUBLIC_STORY_SELECT,
  })
}
