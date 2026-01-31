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
  const now = new Date()
  return prisma.feed.findMany({
    where: {
      active: true,
      OR: [
        { lastCrawledAt: null },
        {
          lastCrawledAt: {
            lt: new Date(now.getTime() - 1000 * 60 * 60), // at least 1 hour ago (actual interval checked below)
          },
        },
      ],
    },
    include: { issue: true },
  }).then(feeds =>
    feeds.filter(f => {
      if (!f.lastCrawledAt) return true
      const intervalMs = f.crawlIntervalHours * 60 * 60 * 1000
      return now.getTime() - f.lastCrawledAt.getTime() >= intervalMs
    })
  )
}

export async function updateLastCrawled(id: string): Promise<void> {
  await prisma.feed.update({
    where: { id },
    data: { lastCrawledAt: new Date() },
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
