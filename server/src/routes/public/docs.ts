import { Router } from 'express'
import { getOpenAPIDocument } from '../../lib/openapi.js'

const router = Router()

let cachedSpec: object | null = null

router.get('/openapi.json', (_req, res) => {
  if (!cachedSpec) {
    cachedSpec = getOpenAPIDocument()
  }
  res.set('Cache-Control', 'public, max-age=3600')
  res.json(cachedSpec)
})

export default router
