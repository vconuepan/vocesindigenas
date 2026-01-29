import { getStoriesByStatus } from '../services/story.js'
import { selectStories } from '../services/analysis.js'

export async function runSelectStories(): Promise<void> {
  console.log('[select_stories] Starting selection job')

  const stories = await getStoriesByStatus('analyzed', { hoursAgo: 48 })
  if (stories.length === 0) {
    console.log('[select_stories] No analyzed stories to select from')
    return
  }

  const ids = stories.map(s => s.id)
  console.log(`[select_stories] Selecting from ${ids.length} analyzed stories`)

  const result = await selectStories(ids)
  console.log(`[select_stories] Completed: ${result.selected.length} selected, ${result.rejected.length} rejected`)
}
