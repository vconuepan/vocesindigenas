import { z } from "zod";
import { EMOTION_TAG_SCHEMA_DESCRIPTION } from "../prompts/shared.js";

const EMOTION_TAG_SCHEMA = z
  .enum(["uplifting", "frustrating", "scary", "calm"])
  .describe(EMOTION_TAG_SCHEMA_DESCRIPTION);

export const preAssessItemSchema = z.object({
  articleId: z
    .string()
    .describe("The article ID exactly as provided in the input"),
  issueSlug: z
    .string()
    .describe("The slug of the most relevant issue from the <ISSUES> list"),
  rating: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      "Conservative relevance rating 1-10 as per the <RATING GUIDELINES>."
    ),
  emotionTag: EMOTION_TAG_SCHEMA,
});

export const preAssessResultSchema = z.object({
  articles: z
    .array(preAssessItemSchema)
    .describe("One entry per article in the input batch"),
});

export const assessResultSchema = z.object({
  publicationDate: z
    .string()
    .describe(
      "Publication date in YYYY-MM-DD 00:00:00 format, or 1970-01-01 00:00:00 if unknown"
    ),
  quote: z
    .string()
    .describe(
      "Key quote from the article, translated to English if needed. " +
        "No speaker/publication name — attribution is a separate field. " +
        "No surrounding quotation marks — the UI adds those. " +
        "Use single quotes (' ') for any nested quotation within the text."
    ),
  quoteAttribution: z
    .string()
    .describe(
      "Attribution for the key quote. If quoting a person, use their full name and title/role " +
        "(e.g. 'Maria Helena Semedo, FAO Deputy Director'). If quoting an organization or publication, " +
        "use the organization name (e.g. 'World Health Organization'). If the quote is a striking " +
        "sentence from the article rather than a direct quote, use 'Original article'."
    ),
  summary: z
    .string()
    .describe(
      "Plain text summary of the article, 40-70 words. " +
        "Use plain language a general audience can understand. " +
        "Avoid redundancy with the title."
    ),
  factors: z
    .array(z.string())
    .describe(
      "4 Markdown bullet points explaining why the article is relevant for humanity. " +
        "Use plain, concrete language — explain mechanisms in everyday terms. " +
        'Each bullet: "- **[Factor name from article context]:** [1 sentence: assessment.] ' +
        "[for the first two bullets only: 1 additional sentence, e.g. quantification or additional detail.] " +
        '[for the first bullet only: 1 additional sentence, e.g. on the mechanism or context of the impact.]" ' +
        "Order by importance, key factor first."
    ),
  limitingFactors: z
    .array(z.string())
    .describe(
      "Markdown bullet points on why the article might not be so relevant. " +
        "Use plain, specific language anyone can understand. " +
        'Each bullet: "- **[Limiting factor]:** [1 sentence: assessment.] ' +
        '[for the first bullet only: 1 additional sentence, e.g. context or further detail.]" ' +
        "Include applicable generic limiting factors (opinion piece, click-bait, early-stage tech, etc.) " +
        "and topic-specific limiting factors. Order by importance."
    ),
  relevanceCalculation: z
    .array(z.string())
    .describe(
      "Markdown bullet points showing the rating calculation steps. " +
        'Format: "- **[Key factor]:** [rating 1-10]", ' +
        '"- **[Generic limiting factor]:** [modifier +0 to -4]", ' +
        '"- **[Other factors combined]:** [modifier +/- 0-2]".'
    ),
  conservativeRating: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      "Conservative relevance rating 1-10 based on the relevance calculation"
    ),
  relevanceSummary: z
    .string()
    .describe(
      "20-25 word summary of the relevance analysis. " +
        'Do not refer to "the article"; focus on the subject matter. ' +
        "Plain language, no jargon. Include concrete numbers when available. "
    ),
  titleLabel: z
    .string()
    .describe(
      "Ultra-short topic label (1-3 short words, sentence case). " +
        "A tight noun phrase — no conjunctions, no 'and'. Keep words simple and short. " +
        "The label and title work as a pair: the label sets the topic, the title tells the story. " +
        "No word or phrase should appear in both. " +
        "Good: 'EU AI Act', 'Carbon inequality', 'Deepfake laws'. " +
        "Bad: 'Carbon inequality and climate policy' (too long). " +
        "Bad: 'Non-consensual deepfake nudification' (too complex — use 'Deepfake laws')."
    ),
  relevanceTitle: z
    .string()
    .describe(
      "Standalone headline, max 10 words, sentence case (capitalize first word and proper nouns only). " +
        "Write for a smart 16-year-old — no jargon or insider terms. " +
        "Must make sense to someone with no background. " +
        "One story per headline. Don't echo the label — use that word budget to say something new. " +
        "No word or phrase should appear in both the label and the title. " +
        "Be concrete: name the actor, action, or stakes. Cut hedge words like 'could shape' or 'may impact'. " +
        "NEVER use the 'Label: headline' colon pattern — the label is a separate field."
    ),
  marketingBlurb: z
    .string()
    .describe(
      "Plain text, up to 230 characters, summarizing the key point of the original article and the relevance analysis."
    ),
});

export const selectResultSchema = z.object({
  selectedIds: z
    .array(z.string())
    .describe(
      "IDs of the selected articles. Must contain exactly the number of articles requested."
    ),
});

export const newsletterSelectResultSchema = z.object({
  selectedIds: z
    .array(z.string())
    .describe(
      "IDs of the selected articles. Must contain exactly the number of articles requested."
    ),
});

export const newsletterIntroSchema = z.object({
  intro: z
    .string()
    .describe(
      "A 2-3 sentence editorial introduction for the newsletter edition. " +
        "Warm and conversational tone. Plain text only, under 60 words."
    ),
});

export const podcastScriptSchema = z.object({
  script: z
    .string()
    .describe("Full podcast script text ready for text-to-speech"),
});

export const reclassifyItemSchema = z.object({
  articleId: z
    .string()
    .describe("The article ID exactly as provided in the input"),
  issueSlug: z
    .string()
    .describe("The slug of the most relevant issue from the <ISSUES> list"),
  emotionTag: EMOTION_TAG_SCHEMA,
});

export const reclassifyResultSchema = z.object({
  articles: z
    .array(reclassifyItemSchema)
    .describe("One entry per article in the input batch"),
});

export const extractTitleLabelSchema = z.object({
  titleLabel: z
    .string()
    .describe(
      "Ultra-short topic label (1-3 short words, sentence case). Must be a tight noun phrase — no conjunctions, no 'and'. " +
        "Keep words simple and short. " +
        "The label and title work as a pair: the label sets the topic, the title tells the story. " +
        "No word or phrase should appear in both. " +
        "Good: 'EU AI Act', 'Carbon inequality', 'Deepfake laws', 'Nuclear risk', 'Ocean health'. " +
        "Bad: 'Carbon inequality and climate policy' (too long). " +
        "Bad: 'Non-consensual deepfake nudification' (words too long/complex, use 'Deepfake laws')."
    ),
  title: z
    .string()
    .describe(
      "Standalone headline, max 10 words, sentence case (capitalize first word and proper nouns only). " +
        "Write for a smart 16-year-old — no jargon or insider terms. " +
        "Must make sense to someone with no background. " +
        "One story per headline. Don't echo the label — use that word budget to say something new. " +
        "No word or phrase should appear in both the label and the title. " +
        "Be concrete: name the actor, action, or stakes. Cut hedge words like 'could shape' or 'may impact'. " +
        "NEVER use the 'Label: headline' colon pattern — the label is a separate field."
    ),
});

export const extractQuoteAttributionSchema = z.object({
  quote: z
    .string()
    .describe(
      "The key quote, cleaned up. Strip embedded speaker/publication name, surrounding quotation marks, and leftover punctuation. Replace any inner double quotes with single quotes (' ')."
    ),
  quoteAttribution: z
    .string()
    .describe(
      "Attribution for the key quote. If quoting a person, use their full name and title/role " +
        "(e.g. 'Maria Helena Semedo, FAO Deputy Director'). If quoting an organization or publication, " +
        "use the organization name (e.g. 'World Health Organization'). If the quote is a striking " +
        "sentence from the article rather than a direct quote, use 'Original article'."
    ),
});

export type ExtractQuoteAttribution = z.infer<
  typeof extractQuoteAttributionSchema
>;
export const extractRelevanceSummarySchema = z.object({
  relevanceSummary: z
    .string()
    .describe(
      "20-25 word summary of the relevance analysis. " +
        'Do not refer to "the article"; focus on the subject matter. ' +
        "Plain language, no jargon. Include concrete numbers when available. "
    ),
});
export type ExtractRelevanceSummary = z.infer<
  typeof extractRelevanceSummarySchema
>;
export const relatedStoriesResultSchema = z.object({
  selectedIds: z
    .array(z.string())
    .describe(
      "IDs of the most related candidates, in order of relatedness. Must contain exactly the number of articles requested."
    ),
});

export type RelatedStoriesResult = z.infer<typeof relatedStoriesResultSchema>;

export const dedupConfirmationSchema = z.object({
  assessments: z.array(z.object({
    candidateNumber: z.number().int().describe("The candidate number from the input list"),
    isDuplicate: z.boolean().describe("True ONLY if this candidate reports on the exact same specific event as the source. False if they merely share the same topic, conflict, or field."),
    reason: z.string().describe("Brief explanation identifying the specific event in each article and why they are or are not the same event"),
  })).describe("One entry per candidate in the input list"),
});

export type DedupConfirmation = z.infer<typeof dedupConfirmationSchema>;
export type ExtractTitleLabel = z.infer<typeof extractTitleLabelSchema>;
export type PreAssessResult = z.infer<typeof preAssessResultSchema>;
export type AssessResult = z.infer<typeof assessResultSchema>;
export type SelectResult = z.infer<typeof selectResultSchema>;
export type ReclassifyResult = z.infer<typeof reclassifyResultSchema>;
export type NewsletterSelectResult = z.infer<
  typeof newsletterSelectResultSchema
>;
export type NewsletterIntro = z.infer<typeof newsletterIntroSchema>;
export type PodcastScript = z.infer<typeof podcastScriptSchema>;
