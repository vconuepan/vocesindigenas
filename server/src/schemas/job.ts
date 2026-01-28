import { z } from 'zod'

export const updateJobSchema = z.object({
  cronExpression: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
})

export const crawlUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  feedId: z.string().uuid('Must be a valid feed ID'),
})
