import { getStoryIdsByStatus } from '../services/story.js'
import { assessStories } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'

const log = createLogger('assess_stories')

export async function runAssessStories(): Promise<void> {
  log.info('starting full assessment job')

  const globalThreshold = config.assess.fullAssessmentThreshold

  // Fetch per-issue thresholds
  const issues = await prisma.issue.findMany({
    select: { id: true, name: true, minPreRating: true },
  })

  const allIds: string[] = []

  for (const issue of issues) {
    const threshold = issue.minPreRating ?? globalThreshold
    const ids = await getStoryIdsByStatus('pre_analyzed', { ratingMin: threshold, issueId: issue.id })
    if (ids.length > 0) {
      log.info({ issue: issue.name, threshold, storyCount: ids.length }, 'stories qualifying for assessment')
      allIds.push(...ids)
    }
  }

  // Stories with no issue use the global threshold
  const unassignedIds = await getStoryIdsByStatus('pre_analyzed', { ratingMin: globalThreshold, issueId: null })
  if (unassignedIds.length > 0) {
    log.info({ threshold: globalThreshold, storyCount: unassignedIds.length }, 'unassigned stories qualifying for assessment')
    allIds.push(...unassignedIds)
  }

  if (allIds.length === 0) {
    log.info('no pre-analyzed stories above threshold')
    return
  }

  log.info({ storyCount: allIds.length, concurrency: config.concurrency.assess }, 'assessing stories')

  // Each assessStory() call triggers embedding + dedup as fire-and-forget
  const result = await assessStories(allIds)

  log.info({ completed: result.completed, errors: result.errors, total: allIds.length }, 'assessment job finished')
}
