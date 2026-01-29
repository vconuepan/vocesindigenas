import { getStoriesByStatus } from '../services/story.js'
import { preAssessStories } from '../services/analysis.js'

export async function runPreassessStories(): Promise<void> {
  console.log('[preassess_stories] Starting pre-assessment job')

  const stories = await getStoriesByStatus('fetched')
  if (stories.length === 0) {
    console.log('[preassess_stories] No fetched stories to pre-assess')
    return
  }

  const ids = stories.map(s => s.id)
  console.log(`[preassess_stories] Pre-assessing ${ids.length} stories`)

  const results = await preAssessStories(ids)
  console.log(`[preassess_stories] Completed: ${results.length} stories pre-assessed`)
}
