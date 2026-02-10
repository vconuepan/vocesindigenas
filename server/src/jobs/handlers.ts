import { runCrawlFeeds } from './crawlFeeds.js'
import { runPreassessStories } from './preassessStories.js'
import { runAssessStories } from './assessStories.js'
import { runSelectStories } from './selectStories.js'
import { runPublishStories } from './publishStories.js'
import { runBlueskyAutoPost } from './blueskyAutoPost.js'
import { runBlueskyUpdateMetrics } from './blueskyUpdateMetrics.js'

export const JOB_HANDLERS: Record<string, () => Promise<void>> = {
  crawl_feeds: runCrawlFeeds,
  preassess_stories: runPreassessStories,
  assess_stories: runAssessStories,
  select_stories: runSelectStories,
  publish_stories: runPublishStories,
  bluesky_auto_post: runBlueskyAutoPost,
  bluesky_update_metrics: runBlueskyUpdateMetrics,
}
