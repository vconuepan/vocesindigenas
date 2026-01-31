/**
 * Split items into roughly equal groups, each no larger than maxSize.
 * Distributes remainder across the first groups so sizes differ by at most 1.
 */
export function splitIntoGroups<T>(items: T[], maxSize: number): T[][] {
  if (items.length === 0) return []
  if (items.length <= maxSize) return [items]
  const groupCount = Math.ceil(items.length / maxSize)
  const baseSize = Math.floor(items.length / groupCount)
  const remainder = items.length % groupCount
  const groups: T[][] = []
  let offset = 0
  for (let i = 0; i < groupCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0)
    groups.push(items.slice(offset, offset + size))
    offset += size
  }
  return groups
}
