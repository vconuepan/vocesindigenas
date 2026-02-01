import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { type Prisma, ContentStatus, StoryStatus } from '@prisma/client'
import { paginate } from '../lib/paginate.js'
import { getLargeLLM, rateLimitDelay } from './llm.js'
import { buildPodcastPrompt } from '../prompts/index.js'
import { podcastScriptSchema } from '../schemas/llm.js'

interface PodcastFilters {
  status?: string
  page?: number
  pageSize?: number
}

export async function getPodcasts(filters: PodcastFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const where: Prisma.PodcastWhereInput = {}
  if (filters.status) where.status = filters.status as ContentStatus

  return paginate({
    findMany: () =>
      prisma.podcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    count: () => prisma.podcast.count({ where }),
    page,
    pageSize,
  })
}

export async function getPodcastById(id: string) {
  return prisma.podcast.findUnique({ where: { id } })
}

export async function createPodcast(data: { title: string }) {
  return prisma.podcast.create({ data: { title: data.title } })
}

export async function updatePodcast(id: string, data: Prisma.PodcastUpdateInput) {
  return prisma.podcast.update({ where: { id }, data })
}

export async function deletePodcast(id: string) {
  await prisma.podcast.delete({ where: { id } })
}

export async function assignStories(podcastId: string) {
  const podcast = await prisma.podcast.findUnique({ where: { id: podcastId } })
  if (!podcast) throw new Error('Podcast not found')

  const stories = await prisma.story.findMany({
    where: {
      status: { in: [StoryStatus.published, StoryStatus.selected] },
      dateCrawled: { gte: new Date(Date.now() - config.content.storyAssignmentDays * 24 * 60 * 60 * 1000) },
    },
    orderBy: { dateCrawled: 'desc' },
    select: { id: true },
  })

  const storyIds = stories.map(s => s.id)
  if (storyIds.length === 0) throw new Error('No recent stories to assign')

  return prisma.podcast.update({
    where: { id: podcastId },
    data: { storyIds },
  })
}

export async function generateScript(podcastId: string) {
  const podcast = await prisma.podcast.findUnique({ where: { id: podcastId } })
  if (!podcast) throw new Error('Podcast not found')
  if (podcast.storyIds.length === 0) throw new Error('No stories assigned')

  const stories = await prisma.story.findMany({
    where: { id: { in: podcast.storyIds } },
    include: { issue: true, feed: { include: { issue: true } } },
    orderBy: { dateCrawled: 'desc' },
  })

  const storyData = stories.map(s => ({
    category: s.issue?.name || s.feed?.issue?.name || 'General',
    title: s.title || s.sourceTitle,
    summary: s.summary || '',
    publisher: s.feed?.title || 'Unknown',
    relevanceReasons: s.relevanceReasons || '',
    antifactors: s.antifactors || '',
  }))

  const prompt = buildPodcastPrompt(storyData)

  await rateLimitDelay()
  const llm = getLargeLLM()
  const structuredLlm = llm.withStructuredOutput(podcastScriptSchema)
  const response = await structuredLlm.invoke([new HumanMessage(prompt)])

  // Append story list with links (matching PHP format)
  let script = response.script
  script += '\n\n---\n\nLast week, our RelevanceAI evaluated hundreds of news items from around the world. These are the most relevant for humanity:\n\n'
  for (const story of stories) {
    const publisher = story.feed?.title || 'Unknown'
    script += `- ${story.title || story.sourceTitle}\n`
    script += `${publisher} | AI analysis\n`
    script += `${story.sourceUrl}\n`
  }

  return prisma.podcast.update({
    where: { id: podcastId },
    data: { script },
  })
}
