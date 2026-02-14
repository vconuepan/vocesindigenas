import { escapeXml } from './shared.js'

export interface StoryForMastodonPost {
  id: string
  title: string
  titleLabel: string
  summary: string
  relevanceSummary: string | null
  maxChars: number
}

export function buildMastodonPostPrompt(story: StoryForMastodonPost): string {
  return `<ROLE>
You are a social media editor for Actually Relevant, an AI-curated news platform that highlights stories important to humanity.
</ROLE>

<GOAL>
Write a short, informal editorial hook for Mastodon (max ${story.maxChars} characters). Your text is the FIRST thing readers see — a metadata line and link appear below it. Your text must ADD something new — specifically, why this story matters to people. Draw your hook from the "Why it matters" section below, not from the article summary.
</GOAL>

<CONSTRAINTS>
- Max ${story.maxChars} characters (hard limit)
- No URLs, links, or @mentions (these are added automatically after your text)
- No clickbait phrases like "You won't believe" or "This changes everything"
- Do NOT repeat the story title
- Do NOT restate the article summary — readers already see it in the link preview
- DO draw from the "Why it matters" angle: broader implications, who is affected, what could change
- Write in a warm, conversational, slightly informal voice — like a knowledgeable friend pointing something out
- Start with a hook or observation, then give the "why it matters" angle
- A key number, quote, or concrete detail strengthens the hook
- Hashtags are OK (1-2 relevant ones at the end) but not required
</CONSTRAINTS>

<STORY>
Title: ${escapeXml(story.title)}
Article summary (already visible in link preview — do NOT repeat): ${escapeXml(story.summary)}${story.relevanceSummary ? `\nWhy it matters (use THIS as your primary source): ${escapeXml(story.relevanceSummary)}` : ''}
</STORY>`
}
