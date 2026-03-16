interface StoryWithTitle {
  titleLabel?: string | null
  title?: string | null
  sourceTitle: string
}

/** Convierte la primera letra a mayúscula y el resto lo deja como está */
function toSentenceCase(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Get the title label for a story. For stories with a `titleLabel` field, returns it directly.
 * For older stories, attempts to extract a label by splitting `title` on the first colon
 * (only if the prefix is short enough to be a label, not a full sentence).
 */
export function getTitleLabel(story: StoryWithTitle): string | null {
  if (story.titleLabel) return story.titleLabel
  const title = story.title
  if (!title) return null
  const colonIdx = title.indexOf(':')
  if (colonIdx > 0 && colonIdx <= 40) {
    return title.slice(0, colonIdx).trim()
  }
  return null
}

/**
 * Get the headline portion of a story's title, with the label prefix stripped.
 * Falls back to the full title or sourceTitle if no label can be extracted.
 * Always returns sentence case (first letter uppercase).
 */
export function getHeadline(story: StoryWithTitle): string {
  const title = story.title || story.sourceTitle
  // New stories have titleLabel set explicitly — use title as-is
  if (story.titleLabel) return toSentenceCase(title)
  // Legacy fallback: strip the colon-prefix that served as the label
  if (story.title) {
    const colonIdx = story.title.indexOf(':')
    if (colonIdx > 0 && colonIdx <= 40) {
      const afterColon = story.title.slice(colonIdx + 1).trim()
      if (afterColon) return toSentenceCase(afterColon)
    }
  }
  return toSentenceCase(title)
}
