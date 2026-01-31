import { getStoriesByStatus } from '../services/story.js'
import { selectStoriesInGroups } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('select_stories')

export async function runSelectStories(): Promise<void> {
  log.info('starting selection job')

  const stories = await getStoriesByStatus('analyzed', { relevanceMin: 5 })
  if (stories.length === 0) {
    log.info('no analyzed stories with relevance >= 5')
    return
  }

  const ids = stories.map(s => s.id)
  log.info({ storyCount: ids.length, concurrency: config.concurrency.select }, 'selecting stories')

  const result = await selectStoriesInGroups(ids)

  log.info({ selected: result.selected, rejected: result.rejected, errors: result.errors }, 'selection job finished')
}
