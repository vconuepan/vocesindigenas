import { Router } from 'express'
import { z } from 'zod'
import { createLogger } from '../../lib/logger.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import * as clusterService from '../../services/cluster.js'
import { createClusterSchema, searchStoriesQuerySchema } from '../../schemas/cluster.js'

const router = Router()
const log = createLogger('clusters')

const setPrimarySchema = z.object({
  storyId: z.string().uuid(),
})

const removeMemberSchema = z.object({
  storyId: z.string().uuid(),
})

const mergeSchema = z.object({
  sourceId: z.string().uuid(),
})

router.get('/search-stories', validateQuery(searchStoriesQuerySchema), async (req, res) => {
  try {
    const { q, limit } = req.parsedQuery!
    const stories = await clusterService.searchStoriesForCluster(q, limit)
    res.json(stories)
  } catch (err) {
    log.error({ err }, 'failed to search stories for cluster')
    res.status(500).json({ error: 'Failed to search stories' })
  }
})

router.get('/', async (_req, res) => {
  try {
    const clusters = await clusterService.getAllClusters()
    res.json(clusters)
  } catch (err) {
    log.error({ err }, 'failed to list clusters')
    res.status(500).json({ error: 'Failed to list clusters' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const cluster = await clusterService.getClusterById(req.params.id)
    if (!cluster) {
      res.status(404).json({ error: 'Cluster not found' })
      return
    }
    res.json(cluster)
  } catch (err) {
    log.error({ err }, 'failed to get cluster')
    res.status(500).json({ error: 'Failed to get cluster' })
  }
})

router.post('/', validateBody(createClusterSchema), async (req, res) => {
  try {
    const { storyIds, primaryStoryId } = req.body
    const cluster = await clusterService.createManualCluster(storyIds, primaryStoryId)
    res.status(201).json(cluster)
  } catch (err: any) {
    if (err.message?.startsWith('At least 2') || err.message?.startsWith('Primary story')) {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.message?.startsWith('Stories not found')) {
      res.status(404).json({ error: err.message })
      return
    }
    if (err.code === 'ALREADY_CLUSTERED') {
      res.status(409).json({ error: err.message, storyIds: err.storyIds })
      return
    }
    log.error({ err }, 'failed to create cluster')
    res.status(500).json({ error: 'Failed to create cluster' })
  }
})

router.put('/:id/primary', validateBody(setPrimarySchema), async (req, res) => {
  try {
    const cluster = await clusterService.setClusterPrimary(req.params.id, req.body.storyId)
    res.json(cluster)
  } catch (err: any) {
    if (err.message === 'Story is not a member of this cluster') {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Cluster not found' })
      return
    }
    log.error({ err }, 'failed to set cluster primary')
    res.status(500).json({ error: 'Failed to set cluster primary' })
  }
})

router.post('/:id/remove-member', validateBody(removeMemberSchema), async (req, res) => {
  try {
    const cluster = await clusterService.removeFromCluster(req.params.id, req.body.storyId)
    if (!cluster) {
      res.json({ dissolved: true })
      return
    }
    res.json(cluster)
  } catch (err: any) {
    if (err.message === 'Story is not a member of this cluster') {
      res.status(400).json({ error: err.message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Cluster not found' })
      return
    }
    log.error({ err }, 'failed to remove member from cluster')
    res.status(500).json({ error: 'Failed to remove member from cluster' })
  }
})

router.post('/:id/merge', validateBody(mergeSchema), async (req, res) => {
  try {
    const cluster = await clusterService.mergeClusters(req.params.id, req.body.sourceId)
    res.json(cluster)
  } catch (err: any) {
    if (err.message === 'Cannot merge a cluster with itself' ||
        err.message === 'Target cluster not found' ||
        err.message === 'Source cluster not found') {
      res.status(400).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to merge clusters')
    res.status(500).json({ error: 'Failed to merge clusters' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await clusterService.dissolveCluster(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Cluster not found') {
      res.status(404).json({ error: err.message })
      return
    }
    log.error({ err }, 'failed to dissolve cluster')
    res.status(500).json({ error: 'Failed to dissolve cluster' })
  }
})

export default router
