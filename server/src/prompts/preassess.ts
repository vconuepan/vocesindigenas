import { config } from '../config.js'
import { Guidelines, buildGuidelinesXml, containsChineseCharacters } from './shared.js'

export interface StoryForPreassess {
  id: string
  title: string
  content: string
}

export function buildPreassessPrompt(
  stories: StoryForPreassess[],
  guidelines: Guidelines,
): string {
  let query = `<ROLE>
You are a relevance screener evaluating news articles for their importance to humanity.
</ROLE>

<GOAL>
Rate each article's relevance on a 1-10 scale and assign an emotion tag.
</GOAL>

<RATING GUIDELINES>
1-2: Very low impact; limited effect on up to 10 million people.
3-4: Minor impact; affects 10-100 million people or narrowly shifts important norms, laws, or technology.
5-6: Moderate impact; affects 100+ million people or leads to broad, significant change in important systems.
7-8: Major impact; affects over 1 billion people, shifts global systems, or slightly alters humanity's long-term prospects.
9-10: Exceptional impact; transforms the lives of 3+ billion people or fundamentally changes humanity's future.
</RATING GUIDELINES>

`
  const guidelinesXml = buildGuidelinesXml(guidelines)
  query += guidelinesXml

  query += `\n\n<ARTICLES>`

  let capacity = config.llm.preassessBatchSize
  for (const story of stories) {
    if (containsChineseCharacters(story.content)) {
      capacity -= 1.5
    } else {
      capacity -= 1
    }
    if (capacity > 0) {
      query += `\n\n-----\nArticle ID: ${story.id}`
      query += `\nTitle: ${story.title}`
      query += `\n${story.content.substring(0, config.llm.preassessContentMaxLength)} ...`
    }
  }

  query += `\n</ARTICLES>`

  return query
}
