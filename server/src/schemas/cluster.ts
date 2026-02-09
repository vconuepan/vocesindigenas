import { z } from 'zod'

export const createClusterSchema = z.object({
  storyIds: z.array(z.string().uuid())
    .min(2, 'At least 2 stories are required')
    .max(100, 'Maximum 100 stories per cluster')
    .refine(
      ids => new Set(ids).size === ids.length,
      'Duplicate story IDs are not allowed',
    ),
  primaryStoryId: z.string().uuid(),
})

export const searchStoriesQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
})
