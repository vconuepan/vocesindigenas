import { tmpdir } from 'os'
import { join } from 'path'
import prisma from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'
import { paginate } from '../lib/paginate.js'
import { generateCarouselZip, type CarouselStory } from './carousel.js'

interface NewsletterFilters {
  status?: string
  page?: number
  pageSize?: number
}

export async function getNewsletters(filters: NewsletterFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const where: Prisma.NewsletterWhereInput = {}
  if (filters.status) where.status = filters.status as any

  return paginate({
    findMany: () =>
      prisma.newsletter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    count: () => prisma.newsletter.count({ where }),
    page,
    pageSize,
  })
}

export async function getNewsletterById(id: string) {
  return prisma.newsletter.findUnique({ where: { id } })
}

export async function createNewsletter(data: { title: string }) {
  return prisma.newsletter.create({ data: { title: data.title } })
}

export async function updateNewsletter(id: string, data: Prisma.NewsletterUpdateInput) {
  return prisma.newsletter.update({ where: { id }, data })
}

export async function deleteNewsletter(id: string) {
  await prisma.newsletter.delete({ where: { id } })
}

export async function assignStories(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')

  // Find recently published/selected stories from the last 7 days
  const stories = await prisma.story.findMany({
    where: {
      status: { in: ['published' as any, 'selected' as any] },
      dateCrawled: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { dateCrawled: 'desc' },
    select: { id: true },
  })

  const storyIds = stories.map(s => s.id)
  return prisma.newsletter.update({
    where: { id: newsletterId },
    data: { storyIds },
  })
}

export async function generateContent(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (newsletter.storyIds.length === 0) throw new Error('No stories assigned')

  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.storyIds } },
    include: { feed: { include: { issue: true } } },
    orderBy: { dateCrawled: 'desc' },
  })

  // Sort by issue name for grouping
  stories.sort((a, b) => {
    const nameA = a.feed?.issue?.name || ''
    const nameB = b.feed?.issue?.name || ''
    return nameA.localeCompare(nameB)
  })

  let content = ''
  for (const story of stories) {
    const category = story.feed?.issue?.name || 'General'
    const publisher = story.feed?.title || 'Unknown'
    const blurb = story.marketingBlurb || ''
    const summary = story.summary || ''
    const relevanceSummary = story.relevanceReasons || ''

    content += `## ${story.title || story.sourceTitle}\n`
    content += `**${category}** | ${publisher}\n\n`
    if (blurb) content += `${blurb}\n\n`
    if (summary) content += `${summary}\n\n`
    if (relevanceSummary) content += `**Why it matters:** ${relevanceSummary}\n\n`
    content += `[Read original](${story.sourceUrl})\n\n---\n\n`
  }

  return prisma.newsletter.update({
    where: { id: newsletterId },
    data: { content: content.trim() },
  })
}

export async function generateCarouselForNewsletter(newsletterId: string): Promise<string> {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (newsletter.storyIds.length === 0) throw new Error('No stories assigned')

  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.storyIds } },
    include: { feed: { include: { issue: true } } },
    orderBy: { dateCrawled: 'desc' },
  })

  // Sort by issue name for grouping
  stories.sort((a, b) => {
    const nameA = a.feed?.issue?.name || ''
    const nameB = b.feed?.issue?.name || ''
    return nameA.localeCompare(nameB)
  })

  const carouselStories: CarouselStory[] = stories.map(s => ({
    title: s.title || s.sourceTitle,
    category: s.feed?.issue?.name || 'General',
    summary: s.summary || '',
    publisher: s.feed?.title || 'Unknown',
    date: s.sourceDatePublished?.toISOString() || null,
  }))

  const outputDir = join(tmpdir(), `carousel_${newsletterId}_${Date.now()}`)
  return generateCarouselZip(carouselStories, outputDir)
}
