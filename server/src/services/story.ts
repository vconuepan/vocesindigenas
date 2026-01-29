import prisma from '../lib/prisma.js'
import type { Story, Prisma } from '@prisma/client'

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
  rating_asc: { relevanceRatingLow: 'asc' },
  rating_desc: { relevanceRatingLow: 'desc' },
  date_asc: { dateCrawled: 'asc' },
  date_desc: { dateCrawled: 'desc' },
  title_asc: { title: 'asc' },
  title_desc: { title: 'desc' },
}

function buildWhereClause(filters: StoryFilters): Prisma.StoryWhereInput {
  const where: Prisma.StoryWhereInput = {}

  if (filters.status) {
    where.status = filters.status as any
  }
  if (filters.feedId) {
    where.feedId = filters.feedId
  }
  if (filters.issueId) {
    where.feed = { issueId: filters.issueId }
  }
  if (filters.crawledAfter || filters.crawledBefore) {
    where.dateCrawled = {}
    if (filters.crawledAfter) where.dateCrawled.gte = new Date(filters.crawledAfter)
    if (filters.crawledBefore) where.dateCrawled.lte = new Date(filters.crawledBefore)
  }
  if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
    where.relevanceRatingLow = {}
    if (filters.ratingMin !== undefined) where.relevanceRatingLow.gte = filters.ratingMin
    if (filters.ratingMax !== undefined) where.relevanceRatingLow.lte = filters.ratingMax
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

export async function getStoryById(id: string) {
  return prisma.story.findUnique({
    where: { id },
    include: { feed: { include: { issue: true } } },
  })
}

export async function createStory(data: {
  url: string
  title: string
  content: string
  feedId: string
  datePublished?: string
}): Promise<Story> {
  const feed = await prisma.feed.findUnique({ where: { id: data.feedId } })
  if (!feed) {
    throw new Error('Feed not found')
  }
  return prisma.story.create({
    data: {
      url: data.url,
      title: data.title,
      content: data.content,
      feedId: data.feedId,
      datePublished: data.datePublished ? new Date(data.datePublished) : null,
    },
  })
}

export async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set()
  const existing = await prisma.story.findMany({
    where: { url: { in: urls } },
    select: { url: true },
  })
  return new Set(existing.map(s => s.url))
}

export async function updateStory(id: string, data: Record<string, any>): Promise<Story> {
  // Convert datePublished string to Date if present
  const updateData = { ...data }
  if (updateData.datePublished !== undefined) {
    updateData.datePublished = updateData.datePublished ? new Date(updateData.datePublished) : null
  }
  return prisma.story.update({ where: { id }, data: updateData })
}

export async function updateStoryStatus(id: string, status: string): Promise<Story> {
  return prisma.story.update({
    where: { id },
    data: { status: status as any },
  })
}

export async function bulkUpdateStatus(ids: string[], status: string) {
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
  url: true,
  title: true,
  datePublished: true,
  dateCrawled: true,
  status: true,
  relevanceRatingLow: true,
  relevanceRatingHigh: true,
  emotionTag: true,
  aiSummary: true,
  aiQuote: true,
  aiKeywords: true,
  aiMarketingBlurb: true,
  aiRelevanceReasons: true,
  aiAntifactors: true,
  aiScenarios: true,
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
    where.feed = { issue: { slug: options.issueSlug } }
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
  options: { ratingMin?: number; hoursAgo?: number } = {},
) {
  const where: Prisma.StoryWhereInput = { status: status as any }
  if (options.ratingMin !== undefined) {
    where.relevanceRatingLow = { gte: options.ratingMin }
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
  return prisma.story.update({
    where: { id },
    data: { status: 'published' as any },
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
