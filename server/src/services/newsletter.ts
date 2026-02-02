import { tmpdir } from 'os'
import { join } from 'path'
import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { type Prisma, ContentStatus, StoryStatus, NewsletterSendStatus } from '@prisma/client'
import { paginate } from '../lib/paginate.js'
import { generateCarouselZip, type CarouselStory } from './carousel.js'
import * as plunk from './plunk.js'
import { createLogger } from '../lib/logger.js'
import { getLargeLLM, rateLimitDelay } from './llm.js'
import { withRetry } from '../lib/retry.js'
import { buildNewsletterSelectPrompt } from '../prompts/index.js'
import { newsletterSelectResultSchema } from '../schemas/llm.js'

const log = createLogger('newsletter')

interface NewsletterFilters {
  status?: string
  page?: number
  pageSize?: number
}

export async function getNewsletters(filters: NewsletterFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const where: Prisma.NewsletterWhereInput = {}
  if (filters.status) where.status = filters.status as ContentStatus

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

  // Find recently published stories from the last N days
  const stories = await prisma.story.findMany({
    where: {
      status: StoryStatus.published,
      dateCrawled: { gte: new Date(Date.now() - config.content.storyAssignmentDays * 24 * 60 * 60 * 1000) },
    },
    orderBy: { dateCrawled: 'desc' },
    select: { id: true },
  })

  const storyIds = stories.map(s => s.id)
  if (storyIds.length === 0) throw new Error('No recent stories to assign')

  return prisma.newsletter.update({
    where: { id: newsletterId },
    data: { storyIds },
  })
}

export async function selectStoriesForNewsletter(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (newsletter.storyIds.length === 0) throw new Error('No stories in longlist')

  // Fetch stories with title, summary, and issue info
  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.storyIds } },
    select: {
      id: true,
      title: true,
      sourceTitle: true,
      summary: true,
      issue: { select: { id: true, name: true, parentId: true, parent: { select: { name: true } } } },
      feed: { select: { issue: { select: { name: true, parentId: true, parent: { select: { name: true } } } } } },
    },
  })

  // Resolve top-level issue name for each story
  const storiesForPrompt = stories.map(s => {
    const issue = s.issue ?? s.feed?.issue
    const issueName = issue?.parentId && issue.parent
      ? issue.parent.name
      : issue?.name ?? 'General'
    return {
      id: s.id,
      title: s.title || s.sourceTitle,
      summary: s.summary,
      issueName,
    }
  })

  // Get distinct top-level issue names
  const issueNames = [...new Set(storiesForPrompt.map(s => s.issueName))].sort()

  log.info(
    { newsletterId, storyCount: stories.length, issueCount: issueNames.length },
    'selecting stories for newsletter',
  )

  const prompt = buildNewsletterSelectPrompt(
    storiesForPrompt,
    config.newsletter.storiesPerIssue,
    issueNames,
  )

  await rateLimitDelay()
  const llm = getLargeLLM()
  const structuredLlm = llm.withStructuredOutput(newsletterSelectResultSchema)
  const response = await withRetry(
    () => structuredLlm.invoke([new HumanMessage(prompt)]),
    { retries: 3 },
  )

  // Only keep IDs that exist in the longlist
  const longlistSet = new Set(newsletter.storyIds)
  const selectedIds = response.selectedIds.filter(id => longlistSet.has(id))

  log.info(
    { newsletterId, selectedCount: selectedIds.length, requestedCount: config.newsletter.storiesPerIssue * issueNames.length },
    'newsletter story selection complete',
  )

  return prisma.newsletter.update({
    where: { id: newsletterId },
    data: { selectedStoryIds: selectedIds },
  })
}

export async function generateContent(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (newsletter.selectedStoryIds.length === 0) throw new Error('No stories selected')

  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.selectedStoryIds } },
    include: { feed: { include: { issue: true } }, issue: true },
    orderBy: { dateCrawled: 'desc' },
  })

  // Sort by issue name for grouping
  stories.sort((a, b) => {
    const nameA = a.issue?.name || a.feed?.issue?.name || ''
    const nameB = b.issue?.name || b.feed?.issue?.name || ''
    return nameA.localeCompare(nameB)
  })

  let content = ''
  for (const story of stories) {
    const category = story.issue?.name || story.feed?.issue?.name || 'General'
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
  if (newsletter.selectedStoryIds.length === 0) throw new Error('No stories selected')

  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.selectedStoryIds } },
    include: { feed: { include: { issue: true } }, issue: true },
    orderBy: { dateCrawled: 'desc' },
  })

  // Sort by issue name for grouping
  stories.sort((a, b) => {
    const nameA = a.issue?.name || a.feed?.issue?.name || ''
    const nameB = b.issue?.name || b.feed?.issue?.name || ''
    return nameA.localeCompare(nameB)
  })

  const carouselStories: CarouselStory[] = stories.map(s => ({
    title: s.title || s.sourceTitle,
    category: s.issue?.name || s.feed?.issue?.name || 'General',
    summary: s.summary || '',
    publisher: s.feed?.title || 'Unknown',
    date: s.sourceDatePublished?.toISOString() || null,
  }))

  const outputDir = join(tmpdir(), `carousel_${newsletterId}_${Date.now()}`)
  return generateCarouselZip(carouselStories, outputDir)
}

// --- HTML generation ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Converts newsletter markdown content into an HTML email template.
 * Parses the markdown structure produced by generateContent() — each story
 * is an h2 heading followed by metadata, paragraphs, and a "Read original" link.
 */
export async function generateHtmlContent(newsletterId: string): Promise<string> {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (!newsletter.content) throw new Error('No content to convert')

  // Parse the markdown content into story blocks (split on --- separator)
  const sections = newsletter.content.split(/\n---\n/).filter(s => s.trim())

  const storyBlocks = sections.map(section => {
    const lines = section.trim().split('\n').filter(l => l.trim())
    let title = ''
    let meta = ''
    const bodyParts: string[] = []
    let readMoreUrl = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('## ')) {
        title = trimmed.slice(3)
      } else if (trimmed.startsWith('**') && trimmed.includes('|') && !meta) {
        meta = trimmed.replace(/\*\*/g, '')
      } else if (trimmed.startsWith('[Read original]') || trimmed.startsWith('[Read more]')) {
        const match = trimmed.match(/\((https?:\/\/[^)]+)\)/)
        if (match) readMoreUrl = match[1]
      } else if (trimmed.startsWith('**Why it matters:**')) {
        const reason = trimmed.replace('**Why it matters:**', '').trim()
        if (reason) bodyParts.push(`<p style="margin: 0 0 10px; font-size: 14px; color: #525252;"><strong style="color: #171717;">Why it matters:</strong> ${escapeHtml(reason)}</p>`)
      } else if (trimmed) {
        bodyParts.push(`<p style="margin: 0 0 10px; font-size: 15px; color: #525252; line-height: 1.6;">${escapeHtml(trimmed)}</p>`)
      }
    }

    const titleHtml = readMoreUrl
      ? `<a href="${escapeHtml(readMoreUrl)}" style="color: #171717; text-decoration: none;">${escapeHtml(title)}</a>`
      : escapeHtml(title)

    return `
    <tr>
      <td style="padding: 24px 0; border-bottom: 1px solid #e5e5e5;">
        <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #171717;">${titleHtml}</h2>
        ${meta ? `<p style="margin: 0 0 12px; font-size: 13px; color: #737373;">${escapeHtml(meta)}</p>` : ''}
        ${bodyParts.join('\n        ')}
        ${readMoreUrl ? `<a href="${escapeHtml(readMoreUrl)}" style="display: inline-block; font-size: 14px; font-weight: 600; color: #2563eb; text-decoration: none;">Read more &rarr;</a>` : ''}
      </td>
    </tr>`
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(newsletter.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 3px solid #2563eb;">
              <h1 style="margin: 0 0 4px; font-size: 24px; font-weight: 800; color: #171717;">Actually Relevant</h1>
              <p style="margin: 0; font-size: 14px; color: #737373;">${escapeHtml(newsletter.title)}</p>
            </td>
          </tr>

          <!-- Stories -->
          <tr>
            <td style="padding: 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${storyBlocks.join('\n')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #737373;">AI-curated news that matters.</p>
              <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                <a href="https://actuallyrelevant.news" style="color: #2563eb; text-decoration: none;">actuallyrelevant.news</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return html
}

// --- Newsletter sends ---

export async function getNewsletterSends(newsletterId: string) {
  return prisma.newsletterSend.findMany({
    where: { newsletterId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function sendTest(newsletterId: string) {
  const newsletter = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } })
  if (!newsletter.html) throw new Error('No HTML content — generate HTML first')
  const html = newsletter.html

  log.info({ newsletterId }, 'creating test campaign in Plunk')
  const campaign = await plunk.createCampaign({
    name: `[TEST] ${newsletter.title}`,
    subject: `[TEST] ${newsletter.title}`,
    body: html,
    audienceType: config.plunk.testSegmentId ? 'SEGMENT' : 'ALL',
    segmentId: config.plunk.testSegmentId || undefined,
  })

  await plunk.sendCampaign(campaign.id)

  return prisma.newsletterSend.create({
    data: {
      newsletterId,
      plunkCampaignId: campaign.id,
      isTest: true,
      status: 'sent' as NewsletterSendStatus,
      htmlContent: html,
      sentAt: new Date(),
    },
  })
}

export async function sendLive(newsletterId: string, scheduledFor?: string) {
  const newsletter = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } })
  if (!newsletter.html) throw new Error('No HTML content — generate HTML first')
  const html = newsletter.html

  log.info({ newsletterId, scheduledFor }, 'creating live campaign in Plunk')
  const campaign = await plunk.createCampaign({
    name: newsletter.title,
    subject: newsletter.title,
    body: html,
    audienceType: 'ALL',
  })

  await plunk.sendCampaign(campaign.id, scheduledFor)

  const status: NewsletterSendStatus = scheduledFor ? 'scheduled' : 'sending'

  return prisma.newsletterSend.create({
    data: {
      newsletterId,
      plunkCampaignId: campaign.id,
      isTest: false,
      status,
      htmlContent: html,
      sentAt: scheduledFor ? null : new Date(),
    },
  })
}

export async function refreshSendStats(sendId: string) {
  const send = await prisma.newsletterSend.findUniqueOrThrow({ where: { id: sendId } })
  if (!send.plunkCampaignId) throw new Error('No Plunk campaign ID')

  const stats = await plunk.getCampaignStats(send.plunkCampaignId)

  return prisma.newsletterSend.update({
    where: { id: sendId },
    data: { stats: stats as unknown as Prisma.JsonObject },
  })
}
