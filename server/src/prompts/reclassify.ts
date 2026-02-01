import { config } from '../config.js'
import { containsChineseCharacters, escapeXml } from './shared.js'
import type { StoryForPreassess, IssueForPreassess } from './preassess.js'

export function buildReclassifyPrompt(
  stories: StoryForPreassess[],
  issues: IssueForPreassess[],
): string {
  let query = `<ROLE>
You are a news classifier categorizing articles into thematic issues and assigning emotion tags.
</ROLE>

<GOAL>
For each article: classify it into the single most relevant issue and assign an emotion tag. Do not rate the articles.
</GOAL>

<ISSUES>
`

  for (const issue of issues) {
    query += `<ISSUE slug="${escapeXml(issue.slug)}" name="${escapeXml(issue.name)}">${escapeXml(issue.description)}</ISSUE>\n`
  }

  query += `</ISSUES>

<ARTICLES>`

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
