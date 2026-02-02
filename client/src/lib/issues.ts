import type { Story } from '@shared/types'

/**
 * Resolves the top-level issue for a story, preferring story.issue over feed.issue
 * and resolving child issues to their parent.
 */
export function getTopLevelIssue(story: Story): { id: string; name: string } | null {
  const storyIssue = story.issue
  if (storyIssue) {
    if (storyIssue.parentId && storyIssue.parent) {
      return { id: storyIssue.parent.id, name: storyIssue.parent.name }
    }
    return { id: storyIssue.id, name: storyIssue.name }
  }

  const feedIssue = story.feed?.issue
  if (feedIssue) {
    if (feedIssue.parentId && feedIssue.parent) {
      return { id: feedIssue.parent.id, name: feedIssue.parent.name }
    }
    if (feedIssue.id) {
      return { id: feedIssue.id, name: feedIssue.name }
    }
    return { id: feedIssue.name, name: feedIssue.name }
  }

  return null
}
