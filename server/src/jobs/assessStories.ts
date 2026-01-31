import { getStoriesByStatus } from '../services/story.js'
import { assessStories } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('assess_stories')

export async function runAssessStories(): Promise<void> {
  log.info('starting full assessment job')

  const threshold = config.llm.fullAssessmentThreshold
  const stories = await getStoriesByStatus('pre_analyzed', { ratingMin: threshold })
  if (stories.length === 0) {
    log.info('no pre-analyzed stories above threshold')
    return
  }

  log.info({ storyCount: stories.length, threshold, concurrency: config.concurrency.assess }, 'assessing stories')

  const result = await assessStories(stories.map(s => s.id))

  log.info({ completed: result.completed, errors: result.errors, total: stories.length }, 'assessment job finished')
}
