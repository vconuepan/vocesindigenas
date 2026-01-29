import { z } from 'zod'

export const preAssessItemSchema = z.object({
  articleId: z.string(),
  rating: z.number().int().min(1).max(10),
  emotionTag: z.enum(['uplifting', 'surprising', 'frustrating', 'scary', 'calm']),
})

export const preAssessResultSchema = z.object({
  articles: z.array(preAssessItemSchema),
})

export const assessResultSchema = z.object({
  publicationDate: z.string().describe('Publication date in YYYY-MM-DD 00:00:00 format, or 1970-01-01 00:00:00 if unknown'),
  quote: z.string().describe('Key quote from the article, translated to English if needed, with attribution'),
  keywords: z.array(z.string()).describe('3-5 lowercase SEO keywords, focus keyword first'),
  summary: z.string().describe('40-70 word summary including focus keyword and key quote'),
  factors: z.array(z.string()).describe('4 detailed bullet points explaining why the article is relevant for humanity'),
  limitingFactors: z.array(z.string()).describe('Detailed bullet points on why the article might not be so relevant'),
  relevanceCalculation: z.array(z.string()).describe('Bullet points showing the rating calculation steps'),
  conservativeRating: z.number().int().min(1).max(10).describe('Conservative relevance rating 1-10'),
  scenarios: z.array(z.string()).describe('2 bullet points outlining scenarios for higher or lower ratings'),
  speculativeRating: z.number().int().min(1).max(10).describe('Speculative rating, higher but plausible'),
  relevanceSummary: z.string().describe('75-100 word summary explaining the relevance rating'),
  relevanceTitle: z.string().describe('Title in two parts separated by colon, sentence case'),
  marketingBlurb: z.string().describe('Up to 230 chars, starting with publisher name'),
})

export const selectResultSchema = z.object({
  selectedIds: z.array(z.string()),
})

export type PreAssessResult = z.infer<typeof preAssessResultSchema>
export type AssessResult = z.infer<typeof assessResultSchema>
export type SelectResult = z.infer<typeof selectResultSchema>
