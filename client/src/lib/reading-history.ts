const STORAGE_KEY = 'ar-read-stories'
const MAX_ENTRIES = 500

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveReadSet(slugs: Set<string>): void {
  try {
    // FIFO eviction: keep only the most recent entries
    const arr = [...slugs]
    if (arr.length > MAX_ENTRIES) {
      arr.splice(0, arr.length - MAX_ENTRIES)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function markAsRead(slug: string): void {
  const slugs = getReadSet()
  slugs.add(slug)
  saveReadSet(slugs)
}

export function isRead(slug: string): boolean {
  return getReadSet().has(slug)
}

export function getReadSlugs(): Set<string> {
  return getReadSet()
}
