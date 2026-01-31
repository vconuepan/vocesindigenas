import { getStoryIdsByStatus } from '../services/story.js'
import { selectStoriesInGroups } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('select_stories')

export async function runSelectStories(): Promise<void> {
  log.info('starting selection job')

  const ids = await getStoryIdsByStatus('analyzed', { relevanceMin: config.selection.relevanceMin })
  if (ids.length === 0) {
    log.info(`no analyzed stories with relevance >= ${config.selection.relevanceMin}`)
    return
  }

  log.info({ storyCount: ids.length, concurrency: config.concurrency.select }, 'selecting stories')

  const result = await selectStoriesInGroups(ids)

  log.info({ selected: result.selected, rejected: result.rejected, errors: result.errors }, 'selection job finished')
}
