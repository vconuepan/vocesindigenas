import { Router } from 'express'
import * as userService from '../../services/user.js'
import { revokeAllUserTokens } from '../../services/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { createUserSchema, updateUserSchema } from '../../schemas/user.js'

const router = Router()

// All user management requires admin role
router.use(requireRole('admin'))

router.get('/', async (_req, res) => {
  try {
    const users = await userService.listUsers()
    res.json(users)
  } catch (err) {
    console.error('[users] Failed to list users:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Failed to list users' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(user)
  } catch (err) {
    console.error('[users] Failed to get user:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

router.post('/', validateBody(createUserSchema), async (req, res) => {
  try {
    const user = await userService.createUser(req.body)
    res.status(201).json(user)
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A user with this email already exists' })
      return
    }
    console.error('[users] Failed to create user:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

router.put('/:id', validateBody(updateUserSchema), async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body)
    res.json(user)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'User not found' })
      return
    }
    console.error('[users] Failed to update user:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.userId === req.params.id) {
      res.status(400).json({ error: 'Cannot delete your own account' })
      return
    }
    await revokeAllUserTokens(req.params.id)
    await userService.deleteUser(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'User not found' })
      return
    }
    console.error('[users] Failed to delete user:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
