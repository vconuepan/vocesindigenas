import { z } from 'zod'

const storyStatusEnum = z.enum([
  'fetched', 'pre_analyzed', 'analyzed', 'selected', 'published', 'rejected', 'trashed',
])

const emotionTagEnum = z.enum([
  'uplifting', 'surprising', 'frustrating', 'scary', 'calm',
])

const storySortEnum = z.enum([
  'rating_asc', 'rating_desc', 'date_asc', 'date_desc', 'title_asc', 'title_desc',
])

export const createStorySchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  feedId: z.string().uuid('Must be a valid feed ID'),
  datePublished: z.string().datetime().optional(),
})

export const updateStorySchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  datePublished: z.string().datetime().nullable().optional(),
  status: storyStatusEnum.optional(),
  relevanceRatingLow: z.number().int().min(0).max(10).nullable().optional(),
  relevanceRatingHigh: z.number().int().min(0).max(10).nullable().optional(),
  emotionTag: emotionTagEnum.nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  aiQuote: z.string().nullable().optional(),
  aiKeywords: z.array(z.string()).nullable().optional(),
  aiMarketingBlurb: z.string().nullable().optional(),
  aiRelevanceReasons: z.string().nullable().optional(),
  aiAntifactors: z.string().nullable().optional(),
  aiRelevanceCalculation: z.string().nullable().optional(),
  aiScenarios: z.string().nullable().optional(),
})

export const updateStoryStatusSchema = z.object({
  status: storyStatusEnum,
})

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  status: storyStatusEnum,
})

export const storyQuerySchema = z.object({
  status: storyStatusEnum.optional(),
  issueId: z.string().uuid().optional(),
  feedId: z.string().uuid().optional(),
  crawledAfter: z.string().datetime().optional(),
  crawledBefore: z.string().datetime().optional(),
  ratingMin: z.coerce.number().int().min(0).max(10).optional(),
  ratingMax: z.coerce.number().int().min(0).max(10).optional(),
  emotionTag: emotionTagEnum.optional(),
  sort: storySortEnum.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
})

export const preassessBodySchema = z.object({
  storyIds: z.array(z.string().uuid()).optional(),
})

export const selectBodySchema = z.object({
  storyIds: z.array(z.string().uuid()).min(1, 'At least one story ID is required'),
})

export const publicStoryQuerySchema = z.object({
  issueSlug: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
})
