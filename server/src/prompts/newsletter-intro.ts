import { escapeXml } from './shared.js'

export interface StoryForNewsletterIntro {
  title: string
  issueName: string
  blurb: string
  emotionTag: string
}

const INTRO_STYLES = [
  'Open with a vivid, concrete image from one story, then zoom out to its wider significance.',
  'Draw an unexpected connection between two stories from different categories.',
  'Start with a surprising statistic or fact from the stories, then reframe it as cause for measured optimism.',
  'Use a brief analogy or metaphor to capture the thread running through this edition.',
  'Highlight a tension or paradox between two developments, and sit with it honestly.',
]

export function pickIntroStyle(): string {
  return INTRO_STYLES[Math.floor(Math.random() * INTRO_STYLES.length)]
}

export function buildNewsletterIntroPrompt(
  stories: StoryForNewsletterIntro[],
  issueNames: string[],
  style?: string,
): string {
  const chosenStyle = style ?? pickIntroStyle()

  let query = `<ROLE>
You are the editorial voice for "Impacto Indígena," a newsletter that curates the most important news for indigenous peoples.
</ROLE>

<GOAL>
Write a 2-3 sentence editorial opening that creatively connects one or two positive developments from the stories. Do not simply list headlines or mention story titles — instead, distill the underlying good news and weave it into a single thought or observation.
</GOAL>

<STYLE>
${chosenStyle}
</STYLE>

<GUIDELINES>
- Draw on stories tagged "uplifting" or "calm" for inspiration, but never repeat their headlines or titles verbatim.
- Connect the positive developments with an observation, a reflection, or a gentle contrast — not a list ("X happened, and Y happened").
- Ground the intro in one concrete detail from the stories — a place, a number, an image — but do not summarize any story. The detail is a doorway, not a synopsis.
- Tone can range from quietly hopeful to wryly observational to plainly amazed. Match the tone to the strongest story, not to a default warmth. Stay genuine, not hype-driven or clickbaity.
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
