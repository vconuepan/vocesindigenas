import { getStoriesByStatus } from '../services/story.js'
import { assessStory } from '../services/analysis.js'

const FULL_ASSESSMENT_THRESHOLD = 3

export async function runAssessStories(): Promise<void> {
  console.log('[assess_stories] Starting full assessment job')

  const stories = await getStoriesByStatus('pre_analyzed', { ratingMin: FULL_ASSESSMENT_THRESHOLD })
  if (stories.length === 0) {
    console.log('[assess_stories] No pre-analyzed stories above threshold')
    return
  }

  console.log(`[assess_stories] Assessing ${stories.length} stories (rating >= ${FULL_ASSESSMENT_THRESHOLD})`)

  let completed = 0
  let errors = 0
  for (const story of stories) {
    try {
      await assessStory(story.id)
      completed++
    } catch (err) {
      errors++
      console.error(`[assess_stories] Error assessing story ${story.id}:`, err)
    }
  }

  console.log(`[assess_stories] Completed: ${completed} assessed, ${errors} errors`)
}
