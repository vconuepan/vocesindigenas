import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { ContentStatus, StoryStatus } from '@prisma/client'
import { paginate } from '../lib/paginate.js'
import { createLogger } from '../lib/logger.js'
import { getLLMByTier, rateLimitDelay } from './llm.js'
import { withRetry } from '../lib/retry.js'
import { buildEditorialPrompt } from '../prompts/index.js'
import { editorialSchema } from '../schemas/llm.js'

const log = createLogger('editorial')

interface EditorialFilters {
  status?: string
  page?: number
  pageSize?: number
}

export async function getEditorials(filters: EditorialFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (filters.status) where.status = filters.status as ContentStatus

  return paginate({
    findMany: () =>
      prisma.editorial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    count: () => prisma.editorial.count({ where }),
    page,
    pageSize,
  })
}

export async function getEditorialById(id: string) {
  return prisma.editorial.findUnique({ where: { id } })
}

export async function getLatestPublishedEditorials(limit = 10) {
  return prisma.editorial.findMany({
    where: { status: ContentStatus.published },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, title: true, publishedAt: true, createdAt: true },
  })
}

export async function createEditorial(data: { title: string }) {
  return prisma.editorial.create({ data: { title: data.title } })
}

export async function updateEditorial(id: string, data: Record<string, unknown>) {
  return prisma.editorial.update({ where: { id }, data })
}

export async function deleteEditorial(id: string) {
  await prisma.editorial.delete({ where: { id } })
}

export async function publishEditorial(id: string) {
  return prisma.editorial.update({
    where: { id },
    data: { status: ContentStatus.published, publishedAt: new Date() },
  })
}

export async function unpublishEditorial(id: string) {
  return prisma.editorial.update({
    where: { id },
    data: { status: ContentStatus.draft, publishedAt: null },
  })
}

/** Generate editorial content from the week's published stories. */
export async function generateEditorialContent(id: string) {
  const editorial = await prisma.editorial.findUnique({ where: { id } })
  if (!editorial) throw new Error('Editorial not found')

  const stories = await prisma.story.findMany({
    where: {
      status: StoryStatus.published,
      dateCrawled: { gte: new Date(Date.now() - config.content.storyAssignmentDays * 24 * 60 * 60 * 1000) },
    },
    orderBy: [{ relevance: 'desc' }, { dateCrawled: 'desc' }],
    take: 8,
    include: {
      issue: { select: { name: true } },
      feed: { select: { title: true } },
    },
  })

  if (stories.length === 0) throw new Error('No recent stories to generate editorial from')

  const weekLabel = getWeekLabel(new Date())
  const prompt = buildEditorialPrompt(
    stories.map(s => ({
      title: s.title ?? '',
      issueName: s.issue?.name ?? '',
      summary: s.summary ?? '',
      relevanceSummary: s.relevanceSummary ?? undefined,
      publisher: s.feed?.title ?? '',
    })),
    weekLabel,
  )

  await rateLimitDelay()
  const llm = getLLMByTier(config.newsletter.contentModelTier)
  const structuredLlm = llm.withStructuredOutput(editorialSchema, { method: 'functionCalling' })

  log.info({ editorialId: id }, 'generating editorial content')

  const result = await withRetry(
    () => structuredLlm.invoke([new HumanMessage(prompt)]),
  )

  return prisma.editorial.update({
    where: { id },
    data: { title: result.title, content: result.content },
  })
}

/** Format editorial content for LinkedIn: plain text, double line breaks, hashtags. */
export function formatForLinkedIn(editorial: { title: string; content: string }): string {
  const hashtags = '#PueblosIndígenas #DerechosTerritoriales #TransiciónEnergética #ImpactoIndígena #SocialLicense'

  // Content is already plain text — just ensure double newlines between paragraphs
  const body = editorial.content
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n')

  return `${editorial.title}\n\n${body}\n\n${hashtags}`
}

export function getWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `semana ${weekNo} de ${d.getUTCFullYear()}`
}
