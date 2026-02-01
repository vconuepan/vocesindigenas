import type { Issue } from '@shared/types'
import { EditPanel } from './EditPanel'
import { StoryEditForm } from './StoryEditForm'
import { useStory } from '../../hooks/useStories'

interface StoryDetailProps {
  storyId: string | null
  issues: Issue[]
  onClose: () => void
}

export function StoryDetail({ storyId, issues, onClose }: StoryDetailProps) {
  const { data: story, isLoading, error } = useStory(storyId || '')

  return (
    <EditPanel
      open={!!storyId}
      onClose={onClose}
      title={story?.title || story?.sourceTitle || 'Story'}
      loading={isLoading}
      error={!!error}
    >
      {story && <StoryEditForm story={story} issues={issues} onDone={onClose} variant="panel" />}
    </EditPanel>
  )
}
