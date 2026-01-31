import prisma from '../lib/prisma.js'
import type { Feed, Prisma } from '@prisma/client'

interface FeedFilters {
  issueId?: string
  active?: boolean
}

export async function getFeeds(filters?: FeedFilters) {
  const where: Prisma.FeedWhereInput = {}
  if (filters?.issueId) where.issueId = filters.issueId
  if (filters?.active !== undefined) where.active = filters.active
  return prisma.feed.findMany({
    where,
    include: { issue: true },
    orderBy: { title: 'asc' },
  })
}

export async function getFeedById(id: string) {
  return prisma.feed.findUnique({
    where: { id },
    include: { issue: true },
  })
}

export async function createFeed(data: {
  title: string
  url: string
  language?: string
  issueId: string
  crawlIntervalHours?: number
  htmlSelector?: string
}): Promise<Feed> {
  // Verify issue exists
  const issue = await prisma.issue.findUnique({ where: { id: data.issueId } })
  if (!issue) {
    throw new Error('Issue not found')
  }
  return prisma.feed.create({ data })
}

export async function updateFeed(id: string, data: Partial<{
  title: string
  url: string
  language: string
  issueId: string
  crawlIntervalHours: number
  htmlSelector: string | null
  active: boolean
}>): Promise<Feed> {
  if (data.issueId) {
    const issue = await prisma.issue.findUnique({ where: { id: data.issueId } })
    if (!issue) {
      throw new Error('Issue not found')
    }
  }
  return prisma.feed.update({ where: { id }, data })
}

export async function getDueFeeds() {
  // Use raw SQL to filter by each feed's own crawl_interval_hours, avoiding
  // the old coarse 1-hour filter that fetched too many rows
  const dueIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM feeds
    WHERE active = true
    AND (last_crawled_at IS NULL
      OR last_crawled_at + (crawl_interval_hours || ' hours')::interval < NOW())
  `
  if (dueIds.length === 0) return []
  return prisma.feed.findMany({
    where: { id: { in: dueIds.map(f => f.id) } },
    include: { issue: true },
  })
}

const MAX_CONSECUTIVE_FAILURES = 3

export interface CrawlOutcome {
  hadSuccess: boolean
  errorMessage?: string
  newItemCount: number
  rssItemCount: number
  crawlResult?: string
}

export async function updateCrawlStatus(id: string, outcome: CrawlOutcome): Promise<void> {
  const now = new Date()
  const { hadSuccess, errorMessage, newItemCount, rssItemCount } = outcome

  // Determine whether to advance lastCrawledAt:
  // - Yes if at least one article succeeded
  // - Yes if no new items existed (normal "nothing new" scenario)
  // - Yes if consecutive failures exceeded max (prevent infinite retry)
  // - No if all new articles failed extraction
  const isTotalFailure = !hadSuccess && newItemCount > 0

  const data: Record<string, unknown> = {
    lastCrawlError: errorMessage || null,
    lastCrawlErrorAt: errorMessage ? now : null,
    lastCrawlResult: outcome.crawlResult || null,
  }

  if (isTotalFailure) {
    const feed = await prisma.feed.findUnique({ where: { id }, select: { consecutiveFailedCrawls: true } })
    const consecutiveFailures = (feed?.consecutiveFailedCrawls ?? 0) + 1

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      // Force advance after N consecutive total failures
      data.lastCrawledAt = now
      data.consecutiveFailedCrawls = 0
    } else {
      data.consecutiveFailedCrawls = consecutiveFailures
    }
  } else {
    data.lastCrawledAt = now
    data.consecutiveFailedCrawls = 0
  }

  // Health metrics: track empty crawls (RSS returned zero items)
  if (rssItemCount === 0) {
    data.consecutiveEmptyCrawls = { increment: 1 }
  } else if (hadSuccess) {
    data.consecutiveEmptyCrawls = 0
    data.lastSuccessfulCrawlAt = now
  }

  await prisma.feed.update({ where: { id }, data })
}

export async function updateFeedCacheHeaders(id: string, headers: { etag?: string | null; lastModified?: string | null }): Promise<void> {
  await prisma.feed.update({
    where: { id },
    data: {
      lastEtag: headers.etag || null,
      lastModified: headers.lastModified || null,
    },
  })
}

export async function deleteFeed(id: string): Promise<{ action: 'deleted' | 'deactivated' }> {
  const storyCount = await prisma.story.count({ where: { feedId: id } })
  if (storyCount > 0) {
    await prisma.feed.update({ where: { id }, data: { active: false } })
    return { action: 'deactivated' }
  }
  await prisma.feed.delete({ where: { id } })
  return { action: 'deleted' }
}
