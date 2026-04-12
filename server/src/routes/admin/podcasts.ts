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

// PUT /admin/podcasts/:id — actualizar campos (title, script, status)
podcastRouter.put('/:id', async (req, res) => {
  try {
    const { title, script, status, storyIds, selectedStoryIds } = req.body
    const podcast = await prisma.podcast.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(script !== undefined && { script }),
        ...(status !== undefined && { status }),
        ...(storyIds !== undefined && { storyIds }),
        ...(selectedStoryIds !== undefined && { selectedStoryIds }),
      },
    })
    res.json(podcast)
  } catch (err: any) {
    log.error({ err }, 'failed to update podcast')
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Podcast not found' })
    res.status(500).json({ error: 'Failed to update podcast' })
  }
})

// POST /admin/podcasts/:id/assign — asignar noticias recientes al episodio
podcastRouter.post('/:id/assign', async (req, res) => {
  try {
    const existing = await prisma.podcast.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Podcast not found' })
    const stories = await prisma.story.findMany({
      where: { status: 'published', summary: { not: null }, relevanceReasons: { not: null } },
      orderBy: [{ relevance: 'desc' }, { datePublished: 'desc' }],
      take: 20,
      select: { id: true },
    })
    const storyIds = stories.map(s => s.id)
    const podcast = await prisma.podcast.update({
      where: { id: req.params.id },
      data: { storyIds },
    })
    res.json(podcast)
  } catch (err) {
    log.error({ err }, 'failed to assign stories')
    res.status(500).json({ error: 'Failed to assign stories' })
  }
})

// POST /admin/podcasts/:id/generate — regenerar script para episodio existente
podcastRouter.post('/:id/generate', async (req, res) => {
  try {
    const existing = await prisma.podcast.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Podcast not found' })
    if (existing.storyIds.length === 0) return res.status(400).json({ error: 'No stories assigned to podcast' })
    const draft = await generateDraft(existing.storyIds)
    // Copy script/title to existing podcast instead of creating a new one
    const updated = await prisma.podcast.update({
      where: { id: req.params.id },
      data: {
        title: (await prisma.podcast.findUnique({ where: { id: draft.id }, select: { title: true } }))?.title || existing.title,
        script: (await prisma.podcast.findUnique({ where: { id: draft.id }, select: { script: true } }))?.script || existing.script,
      },
    })
    // Remove the temporary draft
    await prisma.podcast.delete({ where: { id: draft.id } })
    res.json(updated)
  } catch (err) {
    log.error({ err }, 'failed to generate podcast script')
    res.status(500).json({ error: 'Failed to generate script' })
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
    res.status(204).send()
  } catch (err: any) {
    log.error({ err }, 'failed to delete podcast')
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Podcast not found' })
    res.status(500).json({ error: 'Failed to delete podcast' })
  }
})
