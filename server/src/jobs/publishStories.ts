import { getStoriesByStatus, bulkUpdateStatus } from '../services/story.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('publish_stories')

export async function runPublishStories(): Promise<void> {
  log.info('starting publish job')

  const stories = await getStoriesByStatus('selected')
  if (stories.length === 0) {
    log.info('no selected stories to publish')
    return
  }

  const ids = stories.map(s => s.id)
  log.info({ storyCount: ids.length }, 'publishing stories')
  for (const story of stories) {
    log.info({ storyId: story.id, title: (story.title || story.sourceTitle)?.slice(0, 80) }, 'publishing')
  }

  const result = await bulkUpdateStatus(ids, 'published')

  log.info({ published: result.count }, 'publish job finished')
}
