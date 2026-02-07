import { escapeXml } from './shared.js'

export interface StoryForNewsletterIntro {
  title: string
  issueName: string
  blurb: string
  emotionTag: string
}

export function buildNewsletterIntroPrompt(
  stories: StoryForNewsletterIntro[],
  issueNames: string[],
): string {
  let query = `<ROLE>
You are a warm, thoughtful editorial voice for "Actually Relevant," a newsletter that curates the most important developments for humanity.
</ROLE>

<GOAL>
Write a 2-3 sentence editorial opening that creatively connects one or two positive developments from the stories. Do not simply list headlines or mention story titles — instead, distill the underlying good news and weave it into a single thought or observation.
</GOAL>

<GUIDELINES>
- Draw on stories tagged "uplifting" or "calm" for inspiration, but never repeat their headlines or titles verbatim.
- Connect the positive developments with an observation, a reflection, or a gentle contrast — not a list ("X happened, and Y happened").
- Be specific enough that the reader feels something concrete, but abstract enough that the intro does not duplicate the stories below.
- Be warm and genuine, not hype-driven or clickbaity.
- Do not use phrases like "this week" or "in this edition" — the context is obvious.
- Do not address the reader directly with "you" or "dear reader."
- Plain text only — no markdown, no bullet points, no headings.
- Do not use em dashes. Use commas, periods, or semicolons instead.
- Keep it under 60 words.
</GUIDELINES>

<ISSUE_CATEGORIES>
${issueNames.map(n => `- ${n}`).join('\n')}
</ISSUE_CATEGORIES>

<STORIES>
`

  for (const story of stories) {
    query += `<STORY>\n`
      + `<ISSUE>${escapeXml(story.issueName)}</ISSUE>\n`
      + `<EMOTION>${escapeXml(story.emotionTag)}</EMOTION>\n`
      + `<TITLE>${escapeXml(story.title)}</TITLE>\n`
      + `<BLURB>${escapeXml(story.blurb)}</BLURB>\n`
      + `</STORY>\n`
  }

  query += `</STORIES>`

  return query
}
