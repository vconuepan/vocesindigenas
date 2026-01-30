import { getStoriesByStatus } from '../services/story.js'
import { selectStories } from '../services/analysis.js'

const MAX_GROUP_SIZE = 20

function splitIntoGroups<T>(items: T[], maxSize: number): T[][] {
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

export async function runSelectStories(): Promise<void> {
  console.log('[select_stories] Starting selection job')

  const stories = await getStoriesByStatus('analyzed', { relevanceMin: 5 })
  if (stories.length === 0) {
    console.log('[select_stories] No analyzed stories with relevance >= 5')
    return
  }

  const ids = stories.map(s => s.id)
  const groups = splitIntoGroups(ids, MAX_GROUP_SIZE)

  console.log(`[select_stories] Selecting from ${ids.length} analyzed stories in ${groups.length} group(s)`)

  let totalSelected = 0
  let totalRejected = 0

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    console.log(`[select_stories] Processing group ${i + 1}/${groups.length} (${group.length} stories)`)
    const result = await selectStories(group)
    totalSelected += result.selected.length
    totalRejected += result.rejected.length
  }

  console.log(`[select_stories] Completed: ${totalSelected} selected, ${totalRejected} rejected`)
}
