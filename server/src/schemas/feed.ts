import { z } from 'zod'

export const createFeedSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  rssUrl: z.string().url('Must be a valid URL'),
  url: z.string().url('Must be a valid URL').nullable().optional(),
  displayTitle: z.string().optional(),
  language: z.string().optional().default('en'),
  issueId: z.string().uuid('Must be a valid issue ID'),
  crawlIntervalHours: z.number().int().positive().optional().default(24),
  htmlSelector: z.string().optional(),
})

export const updateFeedSchema = z.object({
  title: z.string().min(1).optional(),
  rssUrl: z.string().url('Must be a valid URL').optional(),
  url: z.string().url('Must be a valid URL').nullable().optional(),
  displayTitle: z.string().nullable().optional(),
  language: z.string().optional(),
  issueId: z.string().uuid('Must be a valid issue ID').optional(),
  crawlIntervalHours: z.number().int().positive().optional(),
  htmlSelector: z.string().nullable().optional(),
  active: z.boolean().optional(),
})
