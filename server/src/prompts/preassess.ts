import { EMOTION_TAGS_PROMPT_BLOCK, formatIssuesBlock, formatArticlesBlock } from './shared.js'
import type { StoryForPrompt, IssueForPrompt } from './shared.js'

// Re-export with legacy names for backwards compatibility
export type StoryForPreassess = StoryForPrompt
export type IssueForPreassess = IssueForPrompt

export function buildPreassessPrompt(
  stories: StoryForPreassess[],
  issues: IssueForPreassess[],
): string {
  return `<ROLE>
You are a relevance screener evaluating news articles for their importance to humanity.
</ROLE>

<GOAL>
For each article: classify it into the single most relevant issue, rate its relevance on a 1-10 scale, and assign an emotion tag.
</GOAL>

${formatIssuesBlock(issues)}

<RATING GUIDELINES>
1-2: Very low impact; limited effect on up to 10 million people.
3-4: Minor impact; affects 10-100 million people or narrowly shifts important norms, laws, or technology.
5-6: Moderate impact; affects 100+ million people or leads to broad, significant change in important systems.
7-8: Major impact; affects over 1 billion people, shifts global systems, or slightly alters humanity's long-term prospects.
9-10: Exceptional impact; transforms the lives of 3+ billion people or fundamentally changes humanity's future.
</RATING GUIDELINES>

${EMOTION_TAGS_PROMPT_BLOCK}

${formatArticlesBlock(stories)}`
}
