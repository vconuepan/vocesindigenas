import { Router } from 'express'
import * as issueService from '../../services/issue.js'
import { validateBody } from '../../middleware/validate.js'
import { createIssueSchema, updateIssueSchema } from '../../schemas/issue.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const issues = await issueService.getAllIssues()
    res.json(issues)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const issue = await issueService.getIssueById(req.params.id)
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' })
      return
    }
    res.json(issue)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issue' })
  }
})

router.post('/', validateBody(createIssueSchema), async (req, res) => {
  try {
    const issue = await issueService.createIssue(req.body)
    res.status(201).json(issue)
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'An issue with this slug already exists' })
      return
    }
    res.status(500).json({ error: 'Failed to create issue' })
  }
})

router.put('/:id', validateBody(updateIssueSchema), async (req, res) => {
  try {
    const issue = await issueService.updateIssue(req.params.id, req.body)
    res.json(issue)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Issue not found' })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'An issue with this slug already exists' })
      return
    }
    res.status(500).json({ error: 'Failed to update issue' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await issueService.deleteIssue(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.message === 'Cannot delete issue with existing feeds') {
      res.status(409).json({ error: err.message })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Issue not found' })
      return
    }
    res.status(500).json({ error: 'Failed to delete issue' })
  }
})

export default router
