import { z } from 'zod'

export const createNewsletterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
})

export const updateNewsletterSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  storyIds: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

export const sendLiveSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
})

export const newsletterQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})
