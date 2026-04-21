import { useState } from 'react'
import type { Podcast } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useUpdatePodcast, useAssignPodcastStories, useGeneratePodcast, usePublishPodcast } from '../../hooks/usePodcasts'
import { useToast } from '../ui/Toast'
import { AssignedStoriesList } from './AssignedStoriesList'

interface PodcastDetailProps {
  podcast: Podcast
}

export function PodcastDetail({ podcast }: PodcastDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(podcast.title)
  const [editingScript, setEditingScript] = useState(false)
  const [script, setScript] = useState(podcast.script)
  const { toast } = useToast()

  const update = useUpdatePodcast()
  const assign = useAssignPodcastStories()
  const generate = useGeneratePodcast()
  const publish = usePublishPodcast()

  const handleSaveTitle = async () => {
    try {
      await update.mutateAsync({ id: podcast.id, data: { title } })
      toast('success', 'Title updated')
      setEditingTitle(false)
    } catch { toast('error', 'Failed to update title') }
  }

  const handleSaveScript = async () => {
    try {
      await update.mutateAsync({ id: podcast.id, data: { script } })
      toast('success', 'Script updated')
      setEditingScript(false)
    } catch { toast('error', 'Failed to update script') }
  }

  const handlePublishToggle = async () => {
    if (podcast.status === 'published') {
      try {
        await update.mutateAsync({ id: podcast.id, data: { status: 'draft' } })
        toast('success', 'Podcast unpublished')
      } catch { toast('error', 'Failed to unpublish') }
    } else {
      try {
        await publish.mutateAsync(podcast.id)
        toast('success', 'Audio generated and published!')
      } catch { toast('error', 'Failed to generate audio') }
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Title */}
      <div className="flex items-start gap-3">
        {editingTitle ? (
          <div className="flex-1 flex gap-2">
            <Input id="pod-title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={handleSaveTitle} loading={update.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitle(podcast.title) }}>Cancel</Button>
          </div>
        ) : (
          <>
            <Badge variant={podcast.status === 'published' ? 'green' : 'gray'}>
              {podcast.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setEditingTitle(true)}>Edit title</Button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => assign.mutate(podcast.id, {
          onSuccess: () => toast('success', 'Stories assigned'),
          onError: () => toast('error', 'Failed to assign stories'),
        })} loading={assign.isPending}>
          Assign Stories
        </Button>
        <Button variant="secondary" size="sm" onClick={() => generate.mutate(podcast.id, {
          onSuccess: () => toast('success', 'Script generated'),
          onError: () => toast('error', 'Generation failed'),
        })} loading={generate.isPending}>
          {generate.isPending ? 'Generating... (this may take a minute)' : 'Generate Script'}
        </Button>
        <Button variant={podcast.status === 'published' ? 'ghost' : 'primary'} size="sm" onClick={handlePublishToggle} loading={update.isPending || publish.isPending}>
          {publish.isPending ? 'Generating audio...' : podcast.status === 'published' ? 'Unpublish' : 'Publish & Generate Audio'}
        </Button>
      </div>

      {/* Assigned stories */}
      <AssignedStoriesList label="Assigned stories" storyIds={podcast.storyIds} />

      {/* Audio player */}
      {podcast.audioUrl && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Audio</h3>
          <audio controls className="w-full" src={podcast.audioUrl}>
            Your browser does not support the audio element.
          </audio>
          <a
            href={podcast.audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-800 hover:text-brand-700 mt-2 inline-block"
          >
            Download MP3
          </a>
        </div>
      )}

      {/* Script */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">Script</h3>
          {!editingScript && (
            <Button variant="ghost" size="sm" onClick={() => { setScript(podcast.script); setEditingScript(true) }}>Edit</Button>
          )}
        </div>
        {editingScript ? (
          <div className="space-y-3">
            <Textarea id="pod-script" rows={20} value={script} onChange={e => setScript(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveScript} loading={update.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingScript(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {podcast.script || <span className="text-neutral-400 italic">No script yet. Generate or edit manually.</span>}
          </div>
        )}
      </div>
    </div>
  )
}
