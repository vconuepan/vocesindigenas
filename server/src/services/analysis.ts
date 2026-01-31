import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { config } from '../config.js'
import { Semaphore } from '../lib/semaphore.js'
import { splitIntoGroups } from '../lib/utils.js'
import { createLogger } from '../lib/logger.js'
import { taskRegistry } from '../lib/taskRegistry.js'
import { getSmallLLM, getLargeLLM, rateLimitDelay } from './llm.js'
import { buildPreassessPrompt, buildAssessPrompt, buildSelectPrompt } from './prompts.js'
import { preAssessResultSchema, assessResultSchema, selectResultSchema } from '../schemas/llm.js'

const log = createLogger('analysis')

export type ProgressCallback = (
  event: { type: 'completed'; count: number } | { type: 'failed'; count: number; error: string }
) => void

interface Guidelines {
  factors: string
  antifactors: string
  ratings: string
}

function getGuidelines(issue: { promptFactors: string; promptAntifactors: string; promptRatings: string }): Guidelines {
  return {
    factors: issue.promptFactors,
    antifactors: issue.promptAntifactors,
    ratings: issue.promptRatings,
  }
}

export async function preAssessStories(
  storyIds: string[],
  onProgress?: ProgressCallback,
): Promise<{ storyId: string; rating: number; emotionTag: string }[]> {
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
    include: { feed: { include: { issue: true } } },
  })

  // Group stories by issue for batching
  const byIssue = new Map<string, typeof stories>()
  for (const story of stories) {
    const issueId = story.feed.issue.id
    if (!byIssue.has(issueId)) byIssue.set(issueId, [])
    byIssue.get(issueId)!.push(story)
  }

  // Flatten all batches across issues into work items
  interface BatchWork {
    issueId: string
    guidelines: Guidelines
    batch: typeof stories
    batchLabel: string
  }

  const workItems: BatchWork[] = []
  const batchSize = config.llm.preassessBatchSize

  for (const [issueId, issueStories] of byIssue) {
    const issue = issueStories[0].feed.issue
    const guidelines = getGuidelines(issue)
    const totalBatches = Math.ceil(issueStories.length / batchSize)

    for (let i = 0; i < issueStories.length; i += batchSize) {
      const batch = issueStories.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      workItems.push({
        issueId,
        guidelines,
        batch,
        batchLabel: `issue ${issueId} batch ${batchNum}/${totalBatches}`,
      })
    }
  }

  log.info({ batchCount: workItems.length, issueCount: byIssue.size }, 'pre-assessment batches prepared')

  const llm = getSmallLLM()
  const structuredLlm = llm.withStructuredOutput(preAssessResultSchema)
  const semaphore = new Semaphore(config.concurrency.preassess)
  const totalBatches = workItems.length
  let batchesDone = 0

  const settled = await Promise.allSettled(
    workItems.map(work =>
      semaphore.run(async () => {
        log.info({ batch: work.batchLabel, storyCount: work.batch.length }, 'processing batch')

        const prompt = buildPreassessPrompt(
          work.batch.map(s => ({ id: s.id, title: s.sourceTitle, content: s.sourceContent })),
          work.guidelines,
        )

        await rateLimitDelay()
        const response = await structuredLlm.invoke([new HumanMessage(prompt)])
        batchesDone++
        log.info({ progress: `${batchesDone}/${totalBatches}`, resultCount: response.articles.length, batch: work.batchLabel }, 'batch complete')

        const batchResults: { storyId: string; rating: number; emotionTag: string }[] = []
        for (const item of response.articles) {
          const story = work.batch.find(s => s.id === item.articleId)
          if (!story) {
            log.warn({ articleId: item.articleId }, 'LLM returned unknown articleId')
            continue
          }

          await prisma.story.update({
            where: { id: story.id },
            data: {
              relevancePre: item.rating,
              emotionTag: item.emotionTag as any,
              status: 'pre_analyzed',
            },
          })

          batchResults.push({
            storyId: story.id,
            rating: item.rating,
            emotionTag: item.emotionTag,
          })
        }
        onProgress?.({ type: 'completed', count: batchResults.length })
        const missing = work.batch.length - batchResults.length
        if (missing > 0) {
          onProgress?.({ type: 'failed', count: missing, error: 'Story not returned in pre-assessment results' })
        }
        return batchResults
      }),
    ),
  )

  const results: { storyId: string; rating: number; emotionTag: string }[] = []
  let errors = 0
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value)
    } else {
      errors++
      log.error({ err: result.reason }, 'batch failed')
      onProgress?.({ type: 'failed', count: 1, error: result.reason instanceof Error ? result.reason.message : 'Batch failed' })
    }
  }
  if (errors > 0) log.warn({ errorCount: errors }, 'some batches failed')

  return results
}

export async function assessStory(storyId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { feed: { include: { issue: true } } },
  })
  if (!story) throw new Error('Story not found')

  log.info({ storyId, title: story.sourceTitle?.slice(0, 80) }, 'assessing story')

  const guidelines = getGuidelines(story.feed.issue)
  const publisher = story.feed.title
  const prompt = buildAssessPrompt(story.sourceTitle, story.sourceContent, publisher, story.sourceUrl, guidelines)

  await rateLimitDelay()
  const llm = getLargeLLM()
  const structuredLlm = llm.withStructuredOutput(assessResultSchema)
  const parsed = await structuredLlm.invoke([new HumanMessage(prompt)])

  log.info({ storyId, rating: parsed.conservativeRating, title: parsed.relevanceTitle?.slice(0, 60) }, 'assessment complete')

  await prisma.story.update({
    where: { id: storyId },
    data: {
      title: parsed.relevanceTitle || null,
      summary: parsed.summary || null,
      quote: parsed.quote || null,
      marketingBlurb: parsed.marketingBlurb || null,
      relevanceReasons: parsed.factors.join('\n'),
      antifactors: parsed.limitingFactors.join('\n'),
      relevanceCalculation: parsed.relevanceCalculation.join('\n'),
      relevance: parsed.conservativeRating,
      status: 'analyzed',
    },
  })
}

/** Orchestrate concurrent assessment of multiple stories. */
export async function assessStories(
  storyIds: string[],
  onProgress?: ProgressCallback,
): Promise<{ completed: number; errors: number }> {
  const semaphore = new Semaphore(config.concurrency.assess)
  let completed = 0
  let errors = 0

  const settled = await Promise.allSettled(
    storyIds.map(id =>
      semaphore.run(async () => {
        await assessStory(id)
        completed++
        onProgress?.({ type: 'completed', count: 1 })
      }),
    ),
  )

  for (const result of settled) {
    if (result.status === 'rejected') {
      errors++
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      log.error({ storyId: storyIds[settled.indexOf(result)], err: result.reason }, 'story assessment failed')
      onProgress?.({ type: 'failed', count: 1, error: msg })
    }
  }

  return { completed, errors }
}

export async function selectStories(storyIds: string[]): Promise<{ selected: string[]; rejected: string[] }> {
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
  })

  if (stories.length === 0) return { selected: [], rejected: [] }

  log.info({ storyCount: stories.length }, 'selecting from stories')

  const toSelect = Math.ceil(stories.length * 0.5)
  const prompt = buildSelectPrompt(
    stories.map(s => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      relevanceReasons: s.relevanceReasons,
      antifactors: s.antifactors,
      relevanceCalculation: s.relevanceCalculation,
    })),
    toSelect,
  )

  await rateLimitDelay()
  const llm = getLargeLLM()
  const structuredLlm = llm.withStructuredOutput(selectResultSchema)
  const response = await structuredLlm.invoke([new HumanMessage(prompt)])

  log.info({ selectedCount: response.selectedIds.length }, 'LLM selection response received')

  const selectedSet = new Set(response.selectedIds)
  const selected: string[] = []
  const rejected: string[] = []

  for (const story of stories) {
    if (selectedSet.has(story.id)) {
      selected.push(story.id)
    } else {
      rejected.push(story.id)
    }
  }

  if (selected.length > 0) {
    await prisma.story.updateMany({
      where: { id: { in: selected } },
      data: { status: 'selected' },
    })
  }
  if (rejected.length > 0) {
    await prisma.story.updateMany({
      where: { id: { in: rejected } },
      data: { status: 'rejected' },
    })
  }

  return { selected, rejected }
}

/** Split stories into groups and run concurrent selection across groups. */
export async function selectStoriesInGroups(
  storyIds: string[],
  onProgress?: ProgressCallback,
): Promise<{ selected: number; rejected: number; errors: number }> {
  const groups = splitIntoGroups(storyIds, config.selection.maxGroupSize)
  const semaphore = new Semaphore(config.concurrency.select)

  log.info({ storyCount: storyIds.length, groupCount: groups.length }, 'selecting stories in groups')

  let totalSelected = 0
  let totalRejected = 0
  let errors = 0

  const settled = await Promise.allSettled(
    groups.map((group, i) =>
      semaphore.run(async () => {
        log.info({ group: i + 1, totalGroups: groups.length, storyCount: group.length }, 'processing group')
        const result = await selectStories(group)
        const processed = result.selected.length + result.rejected.length
        onProgress?.({ type: 'completed', count: processed })
        const unprocessed = group.length - processed
        if (unprocessed > 0) {
          onProgress?.({ type: 'failed', count: unprocessed, error: 'Story not included in selection result' })
        }
        return result
      }),
    ),
  )

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      totalSelected += result.value.selected.length
      totalRejected += result.value.rejected.length
    } else {
      errors++
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      log.error({ err: result.reason }, 'group selection failed')
      const groupIndex = settled.indexOf(result)
      const failedCount = groups[groupIndex]?.length ?? 0
      onProgress?.({ type: 'failed', count: failedCount, error: msg })
    }
  }

  return { selected: totalSelected, rejected: totalRejected, errors }
}

// --- Bulk wrappers with task progress tracking ---

function taskProgressCallback(taskId: string): ProgressCallback {
  return (event) => {
    if (event.type === 'completed') {
      for (let i = 0; i < event.count; i++) taskRegistry.increment(taskId, 'completed')
    } else {
      for (let i = 0; i < event.count; i++) taskRegistry.increment(taskId, 'failed', event.error)
    }
  }
}

export async function bulkPreAssess(storyIds: string[], taskId: string): Promise<void> {
  try {
    await preAssessStories(storyIds, taskProgressCallback(taskId))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err, taskId }, 'bulk pre-assess failed')
    for (const _id of storyIds) {
      taskRegistry.increment(taskId, 'failed', msg)
    }
  } finally {
    taskRegistry.complete(taskId)
  }
}

export async function bulkAssess(storyIds: string[], taskId: string): Promise<void> {
  try {
    await assessStories(storyIds, taskProgressCallback(taskId))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err, taskId }, 'bulk assess failed')
    for (const _id of storyIds) {
      taskRegistry.increment(taskId, 'failed', msg)
    }
  } finally {
    taskRegistry.complete(taskId)
  }
}

export async function bulkSelect(storyIds: string[], taskId: string): Promise<void> {
  try {
    await selectStoriesInGroups(storyIds, taskProgressCallback(taskId))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err, taskId }, 'bulk select failed')
    for (const _id of storyIds) {
      taskRegistry.increment(taskId, 'failed', msg)
    }
  } finally {
    taskRegistry.complete(taskId)
  }
}
