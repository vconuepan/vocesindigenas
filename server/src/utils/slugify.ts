const MAX_SLUG_LENGTH = 80

/**
 * Convert a string to a URL-friendly slug.
 * Lowercase, hyphens only, no leading/trailing hyphens, truncated at word boundary.
 */
export function slugify(text: string, maxLength = MAX_SLUG_LENGTH): string {
  let slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim hyphens from ends

  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength)
    // Cut at last hyphen to avoid breaking mid-word
    const lastHyphen = slug.lastIndexOf('-')
    if (lastHyphen > maxLength * 0.5) {
      slug = slug.slice(0, lastHyphen)
    }
    slug = slug.replace(/-$/, '')
  }

  return slug || 'untitled'
}
