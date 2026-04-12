export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('es-CL', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Santiago',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Returns age in months (0 = less than 1 month old). */
export function storyAgeMonths(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 30))
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('es-CL', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
  })
}
