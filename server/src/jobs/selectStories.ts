import { getStoryIdsByStatus } from '../services/story.js'
import { selectStoriesInGroups } from '../services/analysis.js'
import { config } from '../config.js'
import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'

const log = createLogger('select_stories')

export async function runSelectStories(): Promise<void> {
  log.info('starting selection job')

  // Snapshot all analyzed stories before filtering, so stories arriving
  // after this point are processed in the next run.
  const allAnalyzed = await getStoryIdsByStatus('analyzed')

  const ids = await getStoryIdsByStatus('analyzed', { relevanceMin: config.selection.relevanceMin })

  // Reject analyzed stories from the snapshot that don't meet threshold
  const qualifiedSet = new Set(ids)
  const belowThreshold = allAnalyzed.filter(id => !qualifiedSet.has(id))

  if (belowThreshold.length > 0) {
    await prisma.story.updateMany({
      where: { id: { in: belowThreshold }, status: 'analyzed' },
      data: { status: 'rejected' },
    })
    log.info({ count: belowThreshold.length }, 'rejected analyzed stories below selection relevance minimum')
  }

  if (ids.length === 0) {
    log.info(`no analyzed stories with relevance >= ${config.selection.relevanceMin}`)
    return
  }

  log.info({ storyCount: ids.length, concurrency: config.concurrency.select }, 'selecting stories')

  const result = await selectStoriesInGroups(ids)

  log.info({ selected: result.selected, rejected: result.rejected, errors: result.errors }, 'selection job finished')
}
