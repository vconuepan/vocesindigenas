import { escapeXml } from './shared.js'

export interface StoryForNewsletterSelect {
  id: string
  title: string | null
  summary: string | null
  issueName: string
  emotionTag: string | null
}

export function buildNewsletterSelectPrompt(
  stories: StoryForNewsletterSelect[],
  storiesPerIssue: number,
  issueNames: string[],
): string {
  let query = `<ROLE>
You are a senior editorial curator selecting stories for a weekly newsletter about the most relevant developments for humanity.
</ROLE>

<GOAL>
Select exactly ${storiesPerIssue} stories from each of the following ${issueNames.length} issue categories (${storiesPerIssue * issueNames.length} stories total):
${issueNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return only the IDs of the selected stories.

If a category has fewer than ${storiesPerIssue} stories available, select all of them.
</GOAL>

<SELECTION_CRITERIA>
- Pick stories that complement each other — avoid two stories covering the same event or angle.
- Prefer stories with concrete, demonstrated real-world impact over announcements or speculation.
- Prefer stories about systemic shifts (policy changes, new norms, international agreements) over isolated incidents.
- Prefer stories with broad scale and lasting consequences.
- Within each category, aim for a mix of tone and subject matter to keep the newsletter engaging.
- Uplifting stories: Aim for at least one third to one half of the total selected stories to be uplifting (tagged "uplifting" in the Emotion field). When choosing between stories of similar relevance, prefer the uplifting one. This does not mean forcing low-relevance uplifting stories over high-relevance alternatives — relevance still matters.
</SELECTION_CRITERIA>

<ARTICLES>
`

  for (const story of stories) {
    query += `<ARTICLE>\n`
      + `<ID>${story.id}</ID>\n`
      + `<ISSUE>${escapeXml(story.issueName)}</ISSUE>\n`
      + `<EMOTION>${escapeXml(story.emotionTag || 'calm')}</EMOTION>\n`
      + `<TITLE>${escapeXml(story.title || '')}</TITLE>\n`
      + `<SUMMARY>${escapeXml(story.summary || '')}</SUMMARY>\n`
      + `</ARTICLE>\n`
  }

  query += `</ARTICLES>`

  return query
}
