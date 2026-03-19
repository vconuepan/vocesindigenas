import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import prisma from '../../lib/prisma.js'
import { generateDraft, publishPodcast } from '../../services/podcast.js'

const log = createLogger('podcast-route')
export const podcastRouter = Router()

// GET /admin/podcasts — listar todos los podcasts
podcastRouter.get('/', async (req, res) => {
  try {
    const podcasts = await prisma.podcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json({ data: podcasts, total: podcasts.length, page: 1, pageSize: 20 })
  } catch (err) {
    log.error({ err }, 'failed to list podcasts')
    res.status(500).json({ error: 'Failed to list podcasts' })
  }
})

// GET /admin/podcasts/:id — obtener un podcast
podcastRouter.get('/:id', async (req, res) => {
  try {
    const podcast = await prisma.podcast.findUnique({
      where: { id: req.params.id },
    })
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' })
    res.json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to get podcast')
    res.status(500).json({ error: 'Failed to get podcast' })
  }
})

// POST /admin/podcasts — crear episodio (alias de /generate, acepta title + storyIds opcionales)
podcastRouter.post('/', async (req, res) => {
  try {
    const { storyIds } = req.body
    log.info({ storyIds }, 'creating podcast draft')
    const draft = await generateDraft(storyIds)
    const podcast = await prisma.podcast.findUnique({ where: { id: draft.id } })
    res.status(201).json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to create podcast')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create podcast' })
  }
})

// POST /admin/podcasts/generate — generar nuevo episodio
podcastRouter.post('/generate', async (req, res) => {
  try {
    const { storyIds } = req.body
    log.info({ storyIds }, 'generating podcast draft')
    const draft = await generateDraft(storyIds)
    const podcast = await prisma.podcast.findUnique({ where: { id: draft.id } })
    res.json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to generate podcast')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate podcast' })
  }
})

// POST /admin/podcasts/:id/publish — publicar (generar audio)
podcastRouter.post('/:id/publish', async (req, res) => {
  try {
    log.info({ podcastId: req.params.id }, 'publishing podcast')
    const podcast = await publishPodcast(req.params.id)
    res.json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to publish podcast')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to publish podcast' })
  }
})

// DELETE /admin/podcasts/:id — eliminar podcast
podcastRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.podcast.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    log.error({ err }, 'failed to delete podcast')
    res.status(500).json({ error: 'Failed to delete podcast' })
  }
})
