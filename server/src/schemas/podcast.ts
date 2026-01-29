import { z } from 'zod'

export const createPodcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
})

export const updatePodcastSchema = z.object({
  title: z.string().min(1).optional(),
  script: z.string().optional(),
  storyIds: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

export const podcastQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})
