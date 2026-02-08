import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { updatePrimary, autoRejectNonPrimary } from './dedup.js'

const log = createLogger('cluster')

const CLUSTER_STORY_SELECT = {
  id: true,
  title: true,
  sourceTitle: true,
  status: true,
  relevance: true,
} as const

export async function getAllClusters() {
  return prisma.storyCluster.findMany({
    include: {
      primaryStory: { select: { id: true, title: true, sourceTitle: true } },
      _count: { select: { stories: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getClusterById(id: string) {
  return prisma.storyCluster.findUnique({
    where: { id },
    include: {
      primaryStory: { select: { id: true, title: true, sourceTitle: true } },
      stories: {
        select: {
          ...CLUSTER_STORY_SELECT,
          feed: { select: { title: true } },
        },
        orderBy: { dateCrawled: 'asc' },
      },
      _count: { select: { stories: true } },
    },
  })
}

export async function setClusterPrimary(clusterId: string, storyId: string) {
  // Verify the story belongs to this cluster
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { clusterId: true },
  })
  if (!story || story.clusterId !== clusterId) {
    throw new Error('Story is not a member of this cluster')
  }

  await prisma.storyCluster.update({
    where: { id: clusterId },
    data: { primaryStoryId: storyId },
  })
  log.info({ clusterId, primaryStoryId: storyId }, 'manually set cluster primary')

  await autoRejectNonPrimary(clusterId)
  return getClusterById(clusterId)
}

export async function removeFromCluster(clusterId: string, storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { clusterId: true, status: true },
  })
  if (!story || story.clusterId !== clusterId) {
    throw new Error('Story is not a member of this cluster')
  }

  // Remove the story from the cluster (and restore to analyzed if auto-rejected)
  await prisma.story.update({
    where: { id: storyId },
    data: {
      clusterId: null,
      ...(story.status === 'rejected' ? { status: 'analyzed' } : {}),
    },
  })

  log.info({ clusterId, storyId }, 'removed story from cluster')

  // Check remaining members
  const remaining = await prisma.story.count({ where: { clusterId } })
  if (remaining <= 1) {
    // Dissolve: restore last member and delete cluster
    await prisma.story.updateMany({
      where: { clusterId, status: 'rejected' },
      data: { status: 'analyzed' },
    })
    await prisma.story.updateMany({
      where: { clusterId },
      data: { clusterId: null },
    })
    await prisma.storyCluster.delete({ where: { id: clusterId } })
    log.info({ clusterId }, 'dissolved cluster after member removal (<=1 remaining)')
    return null
  }

  // Re-elect primary and auto-reject
  await updatePrimary(clusterId)
  await autoRejectNonPrimary(clusterId)
  return getClusterById(clusterId)
}

export async function mergeClusters(targetId: string, sourceId: string) {
  if (targetId === sourceId) {
    throw new Error('Cannot merge a cluster with itself')
  }

  const [target, source] = await Promise.all([
    prisma.storyCluster.findUnique({ where: { id: targetId }, select: { id: true } }),
    prisma.storyCluster.findUnique({ where: { id: sourceId }, select: { id: true } }),
  ])
  if (!target) throw new Error('Target cluster not found')
  if (!source) throw new Error('Source cluster not found')

  // Move all source members to target
  await prisma.story.updateMany({
    where: { clusterId: sourceId },
    data: { clusterId: targetId },
  })

  // Clear primary reference before deleting to avoid FK issues
  await prisma.storyCluster.update({
    where: { id: sourceId },
    data: { primaryStoryId: null },
  })

  // Delete source cluster
  await prisma.storyCluster.delete({ where: { id: sourceId } })

  log.info({ targetId, sourceId }, 'merged clusters')

  // Re-elect primary and auto-reject
  await updatePrimary(targetId)
  await autoRejectNonPrimary(targetId)
  return getClusterById(targetId)
}

export async function dissolveCluster(clusterId: string) {
  const cluster = await prisma.storyCluster.findUnique({
    where: { id: clusterId },
    select: { id: true },
  })
  if (!cluster) throw new Error('Cluster not found')

  // Restore auto-rejected members to analyzed
  await prisma.story.updateMany({
    where: { clusterId, status: 'rejected' },
    data: { status: 'analyzed' },
  })

  // Remove all members from cluster
  await prisma.story.updateMany({
    where: { clusterId },
    data: { clusterId: null },
  })

  // Delete the cluster record
  await prisma.storyCluster.delete({ where: { id: clusterId } })

  log.info({ clusterId }, 'dissolved cluster via admin action')
}
