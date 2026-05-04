import { Router } from 'express'
import { createLogger } from '../../lib/logger.js'
import { getEditorials, getEditorialById } from '../../services/editorial.js'

const router = Router()
const log = createLogger('public-editorials')

router.get('/', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1
    const pageSize = Math.min(req.query.pageSize ? parseInt(req.query.pageSize as string) : 10, 50)
    const result = await getEditorials({ status: 'published', page, pageSize })
    res.json(result)
  } catch (err) {
    log.error({ err }, 'failed to fetch public editorials')
    res.status(500).json({ error: 'Failed to fetch editorials' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const editorial = await getEditorialById(req.params.id)
    if (!editorial || editorial.status !== 'published') {
      res.status(404).json({ error: 'Editorial not found' })
      return
    }
    res.json(editorial)
  } catch (err) {
    log.error({ err }, 'failed to fetch public editorial')
    res.status(500).json({ error: 'Failed to fetch editorial' })
  }
})

export default router
