import { escapeXml } from './shared.js'

export interface CandidateStory {
  id: string
  titleLabel: string | null
  title: string | null
}

export function buildRelatedStoriesPrompt(
  source: { titleLabel: string | null; title: string | null },
  candidates: CandidateStory[],
  toSelect: number,
): string {
  let prompt = `<ROLE>
You are a news editor identifying stories that are genuinely related to a source story — covering the same event, topic, policy area, or ongoing development.
</ROLE>

<GOAL>
From the ${candidates.length} candidate stories below, select exactly ${toSelect} that are most closely related to the source story. Return only their IDs, ordered by relatedness (most related first).

"Related" means the stories share a concrete connection: same event, same policy area, same scientific field, same geopolitical situation, or direct cause-and-effect. Superficial thematic overlap (e.g. both mention "climate" but about unrelated aspects) is not enough.
</GOAL>

<SOURCE_STORY>
<Label>${escapeXml(source.titleLabel || '')}</Label>
<Title>${escapeXml(source.title || '')}</Title>
</SOURCE_STORY>

<CANDIDATES>
`

  for (const c of candidates) {
    prompt += `<STORY id="${escapeXml(c.id)}">`
      + `${escapeXml(c.titleLabel || '')} — ${escapeXml(c.title || '')}`
      + `</STORY>\n`
  }

  prompt += '</CANDIDATES>\n'

  return prompt
}
