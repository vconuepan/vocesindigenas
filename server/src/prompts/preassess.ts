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
You are a relevance screener evaluating news articles for their importance to humanity's long-term future.
</ROLE>

<GOAL>
Rate each article's relevance on a 1-10 scale and assign an emotion tag. Be conservative: only about 20% (one in five) of articles should receive a rating of 5 or higher.
</GOAL>

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
