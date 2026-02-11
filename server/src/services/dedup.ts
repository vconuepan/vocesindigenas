import { HumanMessage } from '@langchain/core/messages'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { config } from '../config.js'
import { getLLMByTier, rateLimitDelay } from './llm.js'
import { buildDedupPrompt } from '../prompts/dedup.js'
import { dedupConfirmationSchema } from '../schemas/llm.js'

const log = createLogger('dedup')

// ──── Types ──────────────────────────────────────────────────────────────────

interface NearestCandidate {
  id: string
  distance: number
  title: string
  summary: string
}

interface RawCandidateRow {
  id: string
  distance: number
  title: string | null
  summary: string | null
}

export interface DetectResult {
  clusterId: string | null
  newCluster: boolean
  memberCount: number
  rejectedIds: string[]
}

// ──── Stage 1: Find nearest candidates by cosine distance ────────────────────

export async function findNearestCandidates(
  storyId: string,
  options?: {
    limit?: number
    timeWindowDays?: number
  },
): Promise<NearestCandidate[]> {
  const limit = options?.limit ?? config.dedup.maxCandidates
  const timeWindowDays = options?.timeWindowDays ?? config.dedup.timeWindowDays

  const rows = await prisma.$queryRaw<RawCandidateRow[]>`
    SELECT s.id, s.title, s.summary,
           s.embedding <=> (SELECT embedding FROM stories WHERE id = ${storyId}) AS distance
    FROM stories s
    LEFT JOIN story_clusters sc ON sc.id = s.cluster_id
    WHERE s.id != ${storyId}
      AND s.status IN ('analyzed', 'selected', 'published')
      AND s.embedding IS NOT NULL
      AND s.date_crawled > NOW() - ${timeWindowDays} * INTERVAL '1 day'
      AND (s.cluster_id IS NULL OR sc.primary_story_id = s.id)
    ORDER BY distance ASC
    LIMIT ${limit}
  `

  return rows
    .filter((r): r is RawCandidateRow & { title: string; summary: string } =>
      r.title != null && r.summary != null)
    .map(r => ({
      id: r.id,
      distance: Number(r.distance),
      title: r.title,
      summary: r.summary,
    }))
}

// ──── Stage 2: LLM confirmation ─────────────────────────────────────────────

export async function confirmDuplicates(
  sourceStory: { title: string; summary: string },
  candidates: { id: string; title: string; summary: string }[],
): Promise<{ id: string; isDuplicate: boolean; reason: string }[]> {
  if (candidates.length === 0) return []

  log.info({ candidateCount: candidates.length, sourceTitle: sourceStory.title.slice(0, 80) }, 'sending dedup confirmation to LLM')

  const prompt = buildDedupPrompt(sourceStory, candidates)

  await rateLimitDelay()
  const llm = getLLMByTier(config.dedup.modelTier)
  const structuredLlm = llm.withStructuredOutput(dedupConfirmationSchema)
  const response = await structuredLlm.invoke([new HumanMessage(prompt)])

  const confirmed = response.assessments.filter(a => a.isDuplicate).length
  log.info({ candidateCount: candidates.length, confirmedCount: confirmed }, 'LLM dedup confirmation complete')

  return response.assessments.map(a => {
    const candidate = candidates[a.candidateNumber - 1]
    if (!candidate) {
      log.warn({ candidateNumber: a.candidateNumber, total: candidates.length }, 'LLM returned out-of-range candidate number')
      return null
    }
    return {
      id: candidate.id,
      isDuplicate: a.isDuplicate,
      reason: a.reason,
    }
  }).filter((r): r is NonNullable<typeof r> => r != null)
}

// ──── Stage 3: Cluster management ────────────────────────────────────────────

async function findExistingCluster(storyIds: string[]): Promise<{ id: string } | null> {
  const story = await prisma.story.findFirst({
    where: {
      id: { in: storyIds },
      clusterId: { not: null },
    },
    select: { clusterId: true },
  })
  return story?.clusterId ? { id: story.clusterId } : null
}

async function createCluster(sourceId: string, duplicateIds: string[]): Promise<{ id: string }> {
  const allIds = [sourceId, ...duplicateIds]

  const cluster = await prisma.storyCluster.create({
    data: {
      stories: { connect: allIds.map(id => ({ id })) },
    },
  })

  log.info({ clusterId: cluster.id, memberCount: allIds.length }, 'created new cluster')
  return { id: cluster.id }
}

async function addToCluster(storyId: string, clusterId: string): Promise<void> {
  await prisma.story.update({
    where: { id: storyId },
    data: { clusterId },
  })
  log.info({ storyId, clusterId }, 'added story to existing cluster')
}

// ──── Primary selection ──────────────────────────────────────────────────────

export async function updatePrimary(clusterId: string): Promise<void> {
  const cluster = await prisma.storyCluster.findUnique({
    where: { id: clusterId },
    include: {
      stories: {
        select: {
          id: true,
          status: true,
          relevance: true,
          dateCrawled: true,
          datePublished: true,
        },
      },
    },
  })

  if (!cluster || cluster.stories.length === 0) return

  // Sort by priority: published > highest relevance > first crawled
  const sorted = [...cluster.stories].sort((a, b) => {
    // Published stories first
    if (a.status === 'published' && b.status !== 'published') return -1
    if (b.status === 'published' && a.status !== 'published') return 1

    // Both published: earliest published first
    if (a.status === 'published' && b.status === 'published') {
      const aTime = a.datePublished?.getTime() ?? 0
      const bTime = b.datePublished?.getTime() ?? 0
      return aTime - bTime
    }

    // Both unpublished: highest relevance first
    if ((b.relevance ?? 0) !== (a.relevance ?? 0)) {
      return (b.relevance ?? 0) - (a.relevance ?? 0)
    }

    // Tie-breaker: first crawled
    return a.dateCrawled.getTime() - b.dateCrawled.getTime()
  })

  const newPrimaryId = sorted[0].id
  if (newPrimaryId !== cluster.primaryStoryId) {
    await prisma.storyCluster.update({
      where: { id: clusterId },
      data: { primaryStoryId: newPrimaryId },
    })
    log.info({ clusterId, primaryStoryId: newPrimaryId }, 'updated cluster primary')
  }
}

// ──── Auto-reject non-primary members ────────────────────────────────────────

export async function autoRejectNonPrimary(
  clusterId: string,
  options?: { includePublished?: boolean },
): Promise<string[]> {
  const cluster = await prisma.storyCluster.findUnique({
    where: { id: clusterId },
    include: {
      primaryStory: { select: { id: true, title: true } },
      stories: { select: { id: true, status: true } },
    },
  })

  if (!cluster?.primaryStoryId) return []

  const primaryTitle = cluster.primaryStory?.title ?? 'another story'

  // Non-primary members that should be rejected.
  // In the automatic pipeline, published stories are preserved (admin explicitly published them).
  // For manual admin actions (includePublished=true), published stories are also rejected
  // since the admin is explicitly choosing the primary.
  const toReject = cluster.stories.filter(
    s => s.id !== cluster.primaryStoryId
      && (options?.includePublished || s.status !== 'published')
      && s.status !== 'rejected'
      && s.status !== 'trashed',
  )

  if (toReject.length === 0) return []

  const rejectIds = toReject.map(s => s.id)

  await prisma.story.updateMany({
    where: { id: { in: rejectIds } },
    data: { status: 'rejected' },
  })

  log.info({ clusterId, rejectedIds: rejectIds, primaryStoryId: cluster.primaryStoryId, reason: `Duplicate of: ${primaryTitle}` }, 'auto-rejected non-primary cluster members')
  return rejectIds
}

// ──── Full pipeline ──────────────────────────────────────────────────────────

export async function detectAndCluster(storyId: string): Promise<DetectResult> {
  if (!config.dedup.enabled) {
    return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, title: true, summary: true, clusterId: true },
  })

  if (!story?.title || !story?.summary) {
    log.warn({ storyId }, 'story missing title or summary, skipping dedup')
    return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }
  }

  // Already in a cluster
  if (story.clusterId) {
    log.info({ storyId, clusterId: story.clusterId }, 'story already in a cluster, skipping')
    return { clusterId: story.clusterId, newCluster: false, memberCount: 0, rejectedIds: [] }
  }

  // Stage 1: Find nearest candidates
  const candidates = await findNearestCandidates(storyId)
  if (candidates.length === 0) {
    log.debug({ storyId }, 'no embedding candidates found')
    return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }
  }

  log.info({ storyId, candidateCount: candidates.length, nearestDistance: candidates[0].distance }, 'found dedup candidates')

  // Stage 2: LLM confirmation
  const results = await confirmDuplicates(
    { title: story.title, summary: story.summary },
    candidates,
  )
  const duplicateIds = results.filter(r => r.isDuplicate).map(r => r.id)

  if (duplicateIds.length === 0) {
    log.info({ storyId }, 'no confirmed duplicates')
    return { clusterId: null, newCluster: false, memberCount: 0, rejectedIds: [] }
  }

  log.info({ storyId, confirmedDuplicates: duplicateIds.length }, 'LLM confirmed duplicates')

  // Stage 3: Create or join cluster
  const existingCluster = await findExistingCluster(duplicateIds)

  if (existingCluster) {
    await addToCluster(storyId, existingCluster.id)
    // Also ensure all confirmed duplicates are in the cluster
    for (const dupId of duplicateIds) {
      const dup = await prisma.story.findUnique({ where: { id: dupId }, select: { clusterId: true } })
      if (!dup?.clusterId) {
        await addToCluster(dupId, existingCluster.id)
      }
    }
    await updatePrimary(existingCluster.id)
    const rejectedIds = await autoRejectNonPrimary(existingCluster.id)
    const memberCount = await prisma.story.count({ where: { clusterId: existingCluster.id } })
    return { clusterId: existingCluster.id, newCluster: false, memberCount, rejectedIds }
  }

  const cluster = await createCluster(storyId, duplicateIds)
  await updatePrimary(cluster.id)
  const rejectedIds = await autoRejectNonPrimary(cluster.id)
  return { clusterId: cluster.id, newCluster: true, memberCount: duplicateIds.length + 1, rejectedIds }
}

