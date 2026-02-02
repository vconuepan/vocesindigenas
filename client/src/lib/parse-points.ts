/** Strip markdown inline formatting (bold, italic, links, code) to plain text. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/[*_]{1,3}(.+?)[*_]{1,3}/g, '$1') // **bold**, *italic*, etc.
    .replace(/`([^`]+)`/g, '$1') // `code`
    .trim()
}

/** Strip the label prefix before the first colon, e.g. "Topic label: actual text" → "actual text". */
export function stripPrefix(text: string): string {
  const idx = text.indexOf(':')
  if (idx === -1 || idx > 80) return text // no colon, or colon too far in (likely part of content)
  return text.slice(idx + 1).trim()
}

/** Return the first N sentences from a string. */
export function limitSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]*[.!?]+(?:\s|$)/g)
  if (!sentences) return text
  return sentences.slice(0, max).join('').trim()
}

/**
 * Parse a markdown string into individual points.
 * - If lines start with `- ` or `* `, split on those (markdown list).
 * - Otherwise, split on blank lines (paragraphs) or single newlines.
 * Returns an array of trimmed, non-empty strings.
 */
export function parsePoints(text: string): string[] {
  const lines = text.split('\n')

  // Check if the text uses markdown list syntax
  const hasDashes = lines.some((l) => /^\s*[-*]\s+/.test(l))

  if (hasDashes) {
    // Merge continuation lines (lines that don't start with a dash) into the preceding item
    const points: string[] = []
    for (const line of lines) {
      if (/^\s*[-*]\s+/.test(line)) {
        points.push(line.replace(/^\s*[-*]\s+/, '').trim())
      } else if (points.length > 0 && line.trim()) {
        points[points.length - 1] += ' ' + line.trim()
      }
    }
    return points.filter((p) => p.length > 0)
  }

  // No dashes — split on blank lines first, then on single newlines
  const paragraphs = text.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => p.trim()).filter((p) => p.length > 0)
  }

  // Single block — split on newlines
  return lines.map((l) => l.trim()).filter((l) => l.length > 0)
}
