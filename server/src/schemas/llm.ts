import { z } from 'zod'

export const preAssessItemSchema = z.object({
  articleId: z.string().describe('The article ID exactly as provided in the input'),
  rating: z.number().int().min(1).max(10).describe(
    'Conservative relevance rating 1-10. Only about 20% (one in five) of articles should get a rating of 5 or higher.',
  ),
  emotionTag: z.enum(['uplifting', 'surprising', 'frustrating', 'scary', 'calm']).describe(
    'Emotion tag based on how the article affects readers. '
    + 'uplifting: positive or inspiring stories (e.g. a positive trend or useful new technology). '
    + 'surprising: unexpected or counterintuitive stories (e.g. an effect opposite to expectations). '
    + 'frustrating: negative or disappointing stories (e.g. a policy change that harms the environment). '
    + 'scary: frightening stories (e.g. increased existential risks, wars). '
    + 'calm: stories without a strong association with any other emotion tag.',
  ),
})

export const preAssessResultSchema = z.object({
  articles: z.array(preAssessItemSchema).describe('One entry per article in the input batch'),
})

export const assessResultSchema = z.object({
  publicationDate: z.string().describe(
    'Publication date in YYYY-MM-DD 00:00:00 format, or 1970-01-01 00:00:00 if unknown',
  ),
  quote: z.string().describe(
    'Key quote from the article translated to English if needed, with attribution. '
    + 'Use quotation marks and name the speaker or publication.',
  ),
  summary: z.string().describe(
    'Plain text summary of the article, 40-70 words. '
    + 'Include the key quote with attribution. Avoid redundancy with the title.',
  ),
  factors: z.array(z.string()).describe(
    '4 Markdown bullet points explaining why the article is relevant for humanity. '
    + 'Each bullet: "- **[Factor name from article context]:** [1 sentence: assessment.] '
    + '[1 sentence: classification based on rating criteria with quantification if possible.] '
    + '[1 sentence: mechanism / context of the impact.] '
    + '[1 sentence: example or further details.]" '
    + 'Order by importance, key factor first.',
  ),
  limitingFactors: z.array(z.string()).describe(
    'Markdown bullet points on why the article might not be so relevant. '
    + 'Each bullet: "- **[Limiting factor]:** [1 sentence: assessment.] '
    + '[1 sentence: specific mechanism or context.] '
    + '[1 sentence: example or further details.]" '
    + 'Include applicable generic limiting factors (opinion piece, click-bait, early-stage tech, etc.) '
    + 'and topic-specific limiting factors.',
  ),
  relevanceCalculation: z.array(z.string()).describe(
    'Markdown bullet points showing the rating calculation steps. '
    + 'Format: "- **[Key factor]:** [rating 1-10]", '
    + '"- **[Generic limiting factor]:** [modifier +0 to -4]", '
    + '"- **[Other factors combined]:** [modifier +/- 0-2]".',
  ),
  conservativeRating: z.number().int().min(1).max(10).describe(
    'Conservative relevance rating 1-10 based on the relevance calculation',
  ),
  relevanceSummary: z.string().describe(
    'Markdown-formatted summary explaining the relevance rating, 75-100 words. '
    + 'Reference the key factor and most important factors and limiting factors. '
    + 'Do not refer to "the article"; focus on the subject matter. '
    + 'End with an overall high-level assessment.',
  ),
  relevanceTitle: z.string().describe(
    'Plain text title in two parts separated by a colon, sentence case '
    + '(capitalize first word and proper nouns only). Be descriptive and avoid sensationalist language.',
  ),
  marketingBlurb: z.string().describe(
    'Plain text, up to 230 characters. Start with the publisher name. '
    + 'Mention the key point of the article and key point of the assessment.',
  ),
})

export const selectResultSchema = z.object({
  selectedIds: z.array(z.string()).describe(
    'IDs of the selected articles. Must contain exactly the number of articles requested.',
  ),
})

export const podcastScriptSchema = z.object({
  script: z.string().describe('Full podcast script text ready for text-to-speech'),
})

export type PreAssessResult = z.infer<typeof preAssessResultSchema>
export type AssessResult = z.infer<typeof assessResultSchema>
export type SelectResult = z.infer<typeof selectResultSchema>
export type PodcastScript = z.infer<typeof podcastScriptSchema>
