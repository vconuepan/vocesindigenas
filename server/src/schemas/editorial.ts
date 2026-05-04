import { z } from 'zod'

export const createEditorialSchema = z.object({
  title: z.string().min(1, 'Title is required'),
})

export const updateEditorialSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().optional(),
})

export const editorialQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})
