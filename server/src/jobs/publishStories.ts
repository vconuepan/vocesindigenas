import { getStoriesByStatus, bulkUpdateStatus } from '../services/story.js'

export async function runPublishStories(): Promise<void> {
  console.log('[publish_stories] Starting publish job')

  const stories = await getStoriesByStatus('selected')
  if (stories.length === 0) {
    console.log('[publish_stories] No selected stories to publish')
    return
  }

  const ids = stories.map(s => s.id)
  const result = await bulkUpdateStatus(ids, 'published')

  console.log(`[publish_stories] Published ${result.count} stories`)
}
