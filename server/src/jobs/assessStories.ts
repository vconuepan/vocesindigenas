import { getStoriesByStatus } from '../services/story.js'
import { assessStory } from '../services/analysis.js'
import { config } from '../config.js'

export async function runAssessStories(): Promise<void> {
  console.log('[assess_stories] Starting full assessment job')

  const threshold = config.llm.fullAssessmentThreshold
  const stories = await getStoriesByStatus('pre_analyzed', { ratingMin: threshold })
  if (stories.length === 0) {
    console.log('[assess_stories] No pre-analyzed stories above threshold')
    return
  }

  console.log(`[assess_stories] Assessing ${stories.length} stories (rating >= ${threshold})`)

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
