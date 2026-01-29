import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
})
