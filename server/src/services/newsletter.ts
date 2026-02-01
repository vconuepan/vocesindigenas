import { tmpdir } from 'os'
import { join } from 'path'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { type Prisma, ContentStatus, StoryStatus } from '@prisma/client'

type NewsletterSendStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
import { paginate } from '../lib/paginate.js'
import { generateCarouselZip, type CarouselStory } from './carousel.js'
import * as plunk from './plunk.js'
import { createLogger } from '../lib/logger.js'

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

  // Find recently published/selected stories from the last 7 days
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

// --- HTML generation ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generateHtmlContent(newsletterId: string): Promise<string> {
  const newsletter = await prisma.newsletter.findUnique({ where: { id: newsletterId } })
  if (!newsletter) throw new Error('Newsletter not found')
  if (newsletter.storyIds.length === 0) throw new Error('No stories assigned')

  const stories = await prisma.story.findMany({
    where: { id: { in: newsletter.storyIds } },
    include: {
      feed: { include: { issue: true } },
      issue: true,
    },
    orderBy: { dateCrawled: 'desc' },
  })

  stories.sort((a, b) => {
    const nameA = a.issue?.name || a.feed?.issue?.name || ''
    const nameB = b.issue?.name || b.feed?.issue?.name || ''
    return nameA.localeCompare(nameB)
  })

  const storyBlocks = stories.map((story) => {
    const category = escapeHtml(story.issue?.name || story.feed?.issue?.name || 'General')
    const publisher = escapeHtml(story.feed?.title || 'Unknown')
    const title = escapeHtml(story.title || story.sourceTitle)
    const blurb = story.marketingBlurb ? escapeHtml(story.marketingBlurb) : ''
    const summary = story.summary ? escapeHtml(story.summary) : ''
    const relevance = story.relevanceReasons ? escapeHtml(story.relevanceReasons) : ''
    const slug = story.slug ? `https://actuallyrelevant.news/stories/${story.slug}` : story.sourceUrl

    return `
    <tr>
      <td style="padding: 24px 0; border-bottom: 1px solid #e5e5e5;">
        <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #171717;">
          <a href="${escapeHtml(slug)}" style="color: #171717; text-decoration: none;">${title}</a>
        </h2>
        <p style="margin: 0 0 12px; font-size: 13px; color: #737373;">${category} &middot; ${publisher}</p>
        ${blurb ? `<p style="margin: 0 0 10px; font-size: 15px; color: #404040; font-style: italic;">${blurb}</p>` : ''}
        ${summary ? `<p style="margin: 0 0 10px; font-size: 15px; color: #525252; line-height: 1.6;">${summary}</p>` : ''}
        ${relevance ? `<p style="margin: 0 0 10px; font-size: 14px; color: #525252;"><strong style="color: #171717;">Why it matters:</strong> ${relevance}</p>` : ''}
        <a href="${escapeHtml(slug)}" style="display: inline-block; font-size: 14px; font-weight: 600; color: #2563eb; text-decoration: none;">Read more &rarr;</a>
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
  return (prisma as any).newsletterSend.findMany({
    where: { newsletterId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function sendTest(newsletterId: string) {
  const html = await generateHtmlContent(newsletterId)
  const newsletter = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } })

  log.info({ newsletterId }, 'creating test campaign in Plunk')
  const campaign = await plunk.createCampaign({
    name: `[TEST] ${newsletter.title}`,
    subject: `[TEST] ${newsletter.title}`,
    body: html,
    audienceType: config.plunk.testSegmentId ? 'SEGMENT' : 'ALL',
    segmentId: config.plunk.testSegmentId || undefined,
  })

  await plunk.testCampaign(campaign.id)

  return (prisma as any).newsletterSend.create({
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
  const html = await generateHtmlContent(newsletterId)
  const newsletter = await prisma.newsletter.findUniqueOrThrow({ where: { id: newsletterId } })

  log.info({ newsletterId, scheduledFor }, 'creating live campaign in Plunk')
  const campaign = await plunk.createCampaign({
    name: newsletter.title,
    subject: newsletter.title,
    body: html,
    audienceType: 'ALL',
  })

  await plunk.sendCampaign(campaign.id, scheduledFor)

  const status: NewsletterSendStatus = scheduledFor ? 'scheduled' : 'sending'

  return (prisma as any).newsletterSend.create({
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
  const send = await (prisma as any).newsletterSend.findUniqueOrThrow({ where: { id: sendId } })
  if (!send.plunkCampaignId) throw new Error('No Plunk campaign ID')

  const stats = await plunk.getCampaignStats(send.plunkCampaignId)

  return (prisma as any).newsletterSend.update({
    where: { id: sendId },
    data: { stats: stats as unknown as Prisma.JsonObject },
  })
}
