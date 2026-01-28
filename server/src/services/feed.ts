import prisma from '../lib/prisma.js'
import type { Feed } from '@prisma/client'

interface FeedFilters {
  issueId?: string
  active?: boolean
}

export async function getFeeds(filters?: FeedFilters) {
  const where: any = {}
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

export async function deleteFeed(id: string): Promise<void> {
  const storyCount = await prisma.story.count({ where: { feedId: id } })
  if (storyCount > 0) {
    throw new Error('Cannot delete feed with existing stories')
  }
  await prisma.feed.delete({ where: { id } })
}
