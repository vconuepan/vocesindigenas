import { escapeXml } from './shared.js'

export interface StoryForSelect {
  id: string
  title: string | null
  summary: string | null
  relevanceReasons: string | null
  antifactors: string | null
  relevanceCalculation: string | null
}

export function buildSelectPrompt(
  stories: StoryForSelect[],
  toSelect: number,
): string {
  let query = `<ROLE>
You are a senior editorial curator selecting the most relevant news stories for humanity's long-term future.
</ROLE>

<GOAL>
Select exactly ${toSelect} articles from the ${stories.length} candidates below. Return only their IDs.
</GOAL>

<SELECTION_CRITERIA>
- Compare articles directly against each other rather than relying solely on individual ratings (which were estimated in isolation and may not reflect relative importance).
- Consider humanity's long-term future, including existential risks (pandemics, nuclear wars, AI) and technological capabilities — relevance does not have to be short-term.
- Discard articles that were mistakenly elevated by: sensationalist language, references to important organizations without substantive connection, or weak links to broadly important topics.
</SELECTION_CRITERIA>

`

  for (const story of stories) {
    query += '<ARTICLE>\n'
      + `<ID>${story.id}</ID>\n`
      + `<Title>${escapeXml(story.title || '')}</Title>\n`
      + `<Summary>${escapeXml(story.summary || '')}</Summary>\n`
      + `<Relevance>${escapeXml(story.relevanceReasons || '')}</Relevance>\n`
      + `<Antifactors>${escapeXml(story.antifactors || '')}</Antifactors>\n`
      + `<Calculation>${escapeXml(story.relevanceCalculation || '')}</Calculation>\n`
      + '</ARTICLE>\n'
  }

  return query
}
