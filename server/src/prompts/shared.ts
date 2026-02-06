import { config } from '../config.js'

export interface Guidelines {
  factors: string
  antifactors: string
  ratings: string
}

export function buildGuidelinesXml(g: Guidelines): string {
  return `<FACTORS>\n${g.factors}\n</FACTORS>\n\n<TOPIC-SPECIFIC LIMITING FACTORS>\n${g.antifactors}\n</TOPIC-SPECIFIC LIMITING FACTORS>\n\n<CRITERIA>\n${g.ratings}\n</CRITERIA>`
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function containsChineseCharacters(str: string): boolean {
  return /\p{Script=Han}/u.test(str)
}

// ---------------------------------------------------------------------------
// Emotion tag definitions (single source of truth)
// ---------------------------------------------------------------------------

/**
 * Prompt block for emotion tag guidance.
 * Include in any prompt that asks the LLM to assign emotion tags.
 */
export const EMOTION_TAGS_PROMPT_BLOCK = `<EMOTION TAGS>
- uplifting: Clearly positive or inspiring. The positivity should be obvious and unambiguous — not dependent on a particular viewpoint or bias. A story can be mildly positive and still be uplifting, as long as the positive nature is clear. If there is any real debate about whether it's good news, use calm instead.
- frustrating: Negative, disappointing, or angering.
- scary: Frightening (e.g. increased existential risks, wars, threats).
- calm: Neutral, mixed, or ambiguously positive. Use this as the default when the emotional tone is debatable, when the positivity depends on a specific perspective, or when the story is too nuanced to call clearly positive or negative.
</EMOTION TAGS>`

/**
 * Compact description for Zod schema .describe() calls.
 * Keeps structured output guidance consistent with prompt blocks.
 */
export const EMOTION_TAG_SCHEMA_DESCRIPTION =
  'Emotion tag based on how the article affects readers. ' +
  'uplifting: clearly positive or inspiring — the positivity should be obvious and not dependent on a particular viewpoint. A story can be mildly positive and still be uplifting, as long as it is clearly good news. When in doubt, use calm. ' +
  'frustrating: negative, disappointing, or angering. ' +
  'scary: frightening (e.g. increased existential risks, wars, threats). ' +
  'calm: neutral, mixed, or ambiguously positive — use as the default when the emotional tone is debatable or depends on perspective.'

// ---------------------------------------------------------------------------
// Shared prompt building blocks
// ---------------------------------------------------------------------------

export interface StoryForPrompt {
  id: string
  title: string
  content: string
}

export interface IssueForPrompt {
  slug: string
  name: string
  description: string
}

/**
 * Format an array of issues as XML for prompt inclusion.
 */
export function formatIssuesBlock(issues: IssueForPrompt[]): string {
  let block = '<ISSUES>\n'
  for (const issue of issues) {
    block += `<ISSUE slug="${escapeXml(issue.slug)}" name="${escapeXml(issue.name)}">${escapeXml(issue.description)}</ISSUE>\n`
  }
  block += '</ISSUES>'
  return block
}

/**
 * Format an array of stories as the `<ARTICLES>` prompt block,
 * using capacity tracking to handle Chinese-character articles.
 */
export function formatArticlesBlock(
  stories: StoryForPrompt[],
  batchSize = config.preassess.batchSize,
  contentMaxLength = config.preassess.contentMaxLength,
): string {
  let block = '<ARTICLES>'
  let capacity = batchSize
  for (const story of stories) {
    if (containsChineseCharacters(story.content)) {
      capacity -= 1.5
    } else {
      capacity -= 1
    }
    if (capacity > 0) {
      block += `\n\n-----\nArticle ID: ${story.id}`
      block += `\nTitle: ${story.title}`
      block += `\n${story.content.substring(0, contentMaxLength)} ...`
    }
  }
  block += '\n</ARTICLES>'
  return block
}
