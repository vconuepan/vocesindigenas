import { useState } from 'react'
import type { Story, StoryStatus, EmotionTag } from '@shared/types'
import { STORY_STATUSES, EMOTION_TAGS } from '@shared/constants'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useUpdateStory } from '../../hooks/useStories'
import { useToast } from '../ui/Toast'
import { formatStatus } from '../../lib/constants'

interface StoryEditFormProps {
  story: Story
  onDone: () => void
}

export function StoryEditForm({ story, onDone }: StoryEditFormProps) {
  const [form, setForm] = useState({
    title: story.title ?? '',
    status: story.status,
    relevancePre: story.relevancePre ?? '',
    relevance: story.relevance ?? '',
    emotionTag: story.emotionTag ?? '',
    summary: story.summary ?? '',
    quote: story.quote ?? '',
    marketingBlurb: story.marketingBlurb ?? '',
    relevanceReasons: story.relevanceReasons ?? '',
    antifactors: story.antifactors ?? '',
    relevanceCalculation: story.relevanceCalculation ?? '',
  })

  const updateStory = useUpdateStory()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateStory.mutateAsync({
        id: story.id,
        data: {
          title: form.title || null,
          status: form.status as StoryStatus,
          relevancePre: form.relevancePre === '' ? null : Number(form.relevancePre),
          relevance: form.relevance === '' ? null : Number(form.relevance),
          emotionTag: (form.emotionTag || null) as EmotionTag | null,
          summary: form.summary || null,
          quote: form.quote || null,
          marketingBlurb: form.marketingBlurb || null,
          relevanceReasons: form.relevanceReasons || null,
          antifactors: form.antifactors || null,
          relevanceCalculation: form.relevanceCalculation || null,
        },
      })
      toast('success', 'Story updated')
      onDone()
    } catch {
      toast('error', 'Failed to update story')
    }
  }

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="edit-title" label="Title" value={form.title} onChange={e => set('title', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select
          id="edit-status"
          label="Status"
          value={form.status}
          onChange={e => set('status', e.target.value)}
          options={STORY_STATUSES.map(s => ({ value: s, label: formatStatus(s) }))}
        />
        <Select
          id="edit-emotion"
          label="Emotion"
          placeholder="None"
          value={form.emotionTag}
          onChange={e => set('emotionTag', e.target.value)}
          options={EMOTION_TAGS.map(e => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="edit-rating-pre" label="Pre-rating" type="number" min="1" max="10" value={String(form.relevancePre)} onChange={e => set('relevancePre', e.target.value)} />
        <Input id="edit-rating" label="Rating" type="number" min="1" max="10" value={String(form.relevance)} onChange={e => set('relevance', e.target.value)} />
      </div>
      <Textarea id="edit-summary" label="Summary" rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} />
      <Input id="edit-quote" label="Quote" value={form.quote} onChange={e => set('quote', e.target.value)} />
      <Textarea id="edit-blurb" label="Marketing Blurb" rows={3} value={form.marketingBlurb} onChange={e => set('marketingBlurb', e.target.value)} />
      <Textarea id="edit-reasons" label="Relevance Reasons" rows={3} value={form.relevanceReasons} onChange={e => set('relevanceReasons', e.target.value)} />
      <Textarea id="edit-antifactors" label="Antifactors" rows={3} value={form.antifactors} onChange={e => set('antifactors', e.target.value)} />
      <Textarea id="edit-calculation" label="Relevance Calculation" rows={3} value={form.relevanceCalculation} onChange={e => set('relevanceCalculation', e.target.value)} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={updateStory.isPending}>Save</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
