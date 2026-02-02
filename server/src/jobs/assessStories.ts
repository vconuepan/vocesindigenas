import { getStoryIdsByStatus } from '../services/story.js'
import { assessStories } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('assess_stories')

export async function runAssessStories(): Promise<void> {
  log.info('starting full assessment job')

  const threshold = config.assess.fullAssessmentThreshold
  const ids = await getStoryIdsByStatus('pre_analyzed', { ratingMin: threshold })
  if (ids.length === 0) {
    log.info('no pre-analyzed stories above threshold')
    return
  }

  log.info({ storyCount: ids.length, threshold, concurrency: config.concurrency.assess }, 'assessing stories')

  const result = await assessStories(ids)

  log.info({ completed: result.completed, errors: result.errors, total: ids.length }, 'assessment job finished')
}
