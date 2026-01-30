import { Router } from 'express'
import { Feed } from 'feed'
import * as storyService from '../../services/story.js'
import * as issueService from '../../services/issue.js'

const router = Router()

const FEED_SIZE = 50
const CACHE_MAX_AGE = 900 // 15 minutes

function getSiteUrl(): string {
  return process.env.FRONTEND_URL || 'https://actuallyrelevant.com'
}

function buildFeed(options: { title: string; description: string; feedPath: string }) {
  const siteUrl = getSiteUrl()
  return new Feed({
    title: options.title,
    description: options.description,
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    copyright: `© ${new Date().getFullYear()} Actually Relevant`,
    feedLinks: {
      rss: `${siteUrl}${options.feedPath}`,
    },
  })
}

function setRssHeaders(res: import('express').Response) {
  res.set('Content-Type', 'application/rss+xml; charset=utf-8')
  res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`)
}

// Global feed — all published stories
router.get('/', async (_req, res) => {
  try {
    const result = await storyService.getPublishedStories({ page: 1, pageSize: FEED_SIZE })
    const siteUrl = getSiteUrl()

    const feed = buildFeed({
      title: 'Actually Relevant',
      description: 'AI-curated news that matters. Stories most relevant to humanity\u2019s future.',
      feedPath: '/api/feed',
    })

    for (const story of result.data) {
      feed.addItem({
        title: story.title || story.sourceTitle,
        id: story.id,
        link: `${siteUrl}/stories/${story.slug || story.id}`,
        description: story.summary || undefined,
        date: story.datePublished ? new Date(story.datePublished) : new Date(story.dateCrawled),
        category: story.feed?.issue ? [{ name: story.feed.issue.name }] : undefined,
      })
    }

    setRssHeaders(res)
    res.send(feed.rss2())
  } catch (err) {
    console.error('Failed to generate global RSS feed:', err)
    res.status(500).json({ error: 'Failed to generate feed' })
  }
})

// Per-issue feed
router.get('/:issueSlug', async (req, res) => {
  try {
    const { issueSlug } = req.params
    const issue = await issueService.getIssueBySlug(issueSlug)
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' })
      return
    }

    const result = await storyService.getPublishedStories({
      page: 1,
      pageSize: FEED_SIZE,
      issueSlug,
    })
    const siteUrl = getSiteUrl()

    const feed = buildFeed({
      title: `Actually Relevant — ${issue.name}`,
      description: issue.description || `Stories about ${issue.name} curated by Actually Relevant.`,
      feedPath: `/api/feed/${issueSlug}`,
    })

    for (const story of result.data) {
      feed.addItem({
        title: story.title || story.sourceTitle,
        id: story.id,
        link: `${siteUrl}/stories/${story.slug || story.id}`,
        description: story.summary || undefined,
        date: story.datePublished ? new Date(story.datePublished) : new Date(story.dateCrawled),
        category: story.feed?.issue ? [{ name: story.feed.issue.name }] : undefined,
      })
    }

    setRssHeaders(res)
    res.send(feed.rss2())
  } catch (err) {
    console.error('Failed to generate issue RSS feed:', err)
    res.status(500).json({ error: 'Failed to generate feed' })
  }
})

export default router
