import { z } from 'zod'

export const generateLinkedInDraftBodySchema = z.object({
  storyId: z.string().uuid(),
})

export const updateLinkedInDraftBodySchema = z.object({
  postText: z.string().min(1).max(3000),
})

export const listLinkedInPostsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
