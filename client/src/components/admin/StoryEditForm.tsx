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
    title: story.title,
    status: story.status,
    relevanceRatingLow: story.relevanceRatingLow ?? '',
    relevanceRatingHigh: story.relevanceRatingHigh ?? '',
    emotionTag: story.emotionTag ?? '',
    aiSummary: story.aiSummary ?? '',
    aiQuote: story.aiQuote ?? '',
    aiKeywords: story.aiKeywords?.join(', ') ?? '',
    aiMarketingBlurb: story.aiMarketingBlurb ?? '',
    aiRelevanceReasons: story.aiRelevanceReasons ?? '',
    aiAntifactors: story.aiAntifactors ?? '',
    aiRelevanceCalculation: story.aiRelevanceCalculation ?? '',
    aiScenarios: story.aiScenarios ?? '',
  })

  const updateStory = useUpdateStory()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateStory.mutateAsync({
        id: story.id,
        data: {
          title: form.title,
          status: form.status as StoryStatus,
          relevanceRatingLow: form.relevanceRatingLow === '' ? null : Number(form.relevanceRatingLow),
          relevanceRatingHigh: form.relevanceRatingHigh === '' ? null : Number(form.relevanceRatingHigh),
          emotionTag: (form.emotionTag || null) as EmotionTag | null,
          aiSummary: form.aiSummary || null,
          aiQuote: form.aiQuote || null,
          aiKeywords: form.aiKeywords ? form.aiKeywords.split(',').map(k => k.trim()).filter(Boolean) : null,
          aiMarketingBlurb: form.aiMarketingBlurb || null,
          aiRelevanceReasons: form.aiRelevanceReasons || null,
          aiAntifactors: form.aiAntifactors || null,
          aiRelevanceCalculation: form.aiRelevanceCalculation || null,
          aiScenarios: form.aiScenarios || null,
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
      <Input id="edit-title" label="Title" value={form.title} onChange={e => set('title', e.target.value)} required />
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
        <Input id="edit-rating-low" label="Rating Low" type="number" min="1" max="10" value={String(form.relevanceRatingLow)} onChange={e => set('relevanceRatingLow', e.target.value)} />
        <Input id="edit-rating-high" label="Rating High" type="number" min="1" max="10" value={String(form.relevanceRatingHigh)} onChange={e => set('relevanceRatingHigh', e.target.value)} />
      </div>
      <Textarea id="edit-summary" label="AI Summary" rows={3} value={form.aiSummary} onChange={e => set('aiSummary', e.target.value)} />
      <Input id="edit-quote" label="AI Quote" value={form.aiQuote} onChange={e => set('aiQuote', e.target.value)} />
      <Input id="edit-keywords" label="AI Keywords (comma-separated)" value={form.aiKeywords} onChange={e => set('aiKeywords', e.target.value)} />
      <Textarea id="edit-blurb" label="Marketing Blurb" rows={3} value={form.aiMarketingBlurb} onChange={e => set('aiMarketingBlurb', e.target.value)} />
      <Textarea id="edit-reasons" label="Relevance Reasons" rows={3} value={form.aiRelevanceReasons} onChange={e => set('aiRelevanceReasons', e.target.value)} />
      <Textarea id="edit-antifactors" label="Antifactors" rows={3} value={form.aiAntifactors} onChange={e => set('aiAntifactors', e.target.value)} />
      <Textarea id="edit-calculation" label="Relevance Calculation" rows={3} value={form.aiRelevanceCalculation} onChange={e => set('aiRelevanceCalculation', e.target.value)} />
      <Textarea id="edit-scenarios" label="Future Scenarios" rows={3} value={form.aiScenarios} onChange={e => set('aiScenarios', e.target.value)} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={updateStory.isPending}>Save</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
