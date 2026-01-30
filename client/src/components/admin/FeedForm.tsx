import { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { Feed, Issue } from '@shared/types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useCreateFeed, useUpdateFeed } from '../../hooks/useFeeds'
import { useToast } from '../ui/Toast'

/** Build hierarchical issue options: parents first, children indented under their parent. */
function buildIssueOptions(issues: Issue[]): { value: string; label: string }[] {
  const parents = issues.filter(i => !i.parentId).sort((a, b) => a.name.localeCompare(b.name))
  const childrenByParent = new Map<string, Issue[]>()
  for (const issue of issues) {
    if (issue.parentId) {
      const list = childrenByParent.get(issue.parentId) || []
      list.push(issue)
      childrenByParent.set(issue.parentId, list)
    }
  }
  const options: { value: string; label: string }[] = []
  for (const parent of parents) {
    options.push({ value: parent.id, label: parent.name })
    const children = childrenByParent.get(parent.id) || []
    children.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of children) {
      options.push({ value: child.id, label: `\u00A0\u00A0└ ${child.name}` })
    }
  }
  return options
}

interface FeedFormProps {
  open: boolean
  onClose: () => void
  feed?: Feed | null
  issues: Issue[]
}

export function FeedForm({ open, onClose, feed, issues }: FeedFormProps) {
  const [form, setForm] = useState({
    title: '',
    url: '',
    issueId: '',
    language: 'en',
    crawlIntervalHours: '6',
    htmlSelector: '',
    active: true,
  })

  const createFeed = useCreateFeed()
  const updateFeed = useUpdateFeed()
  const { toast } = useToast()
  const isEditing = !!feed

  useEffect(() => {
    if (feed) {
      setForm({
        title: feed.title,
        url: feed.url,
        issueId: feed.issueId,
        language: feed.language,
        crawlIntervalHours: String(feed.crawlIntervalHours),
        htmlSelector: feed.htmlSelector || '',
        active: feed.active,
      })
    } else {
      setForm({ title: '', url: '', issueId: '', language: 'en', crawlIntervalHours: '6', htmlSelector: '', active: true })
    }
  }, [feed, open])

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: form.title,
      url: form.url,
      issueId: form.issueId,
      language: form.language,
      crawlIntervalHours: Number(form.crawlIntervalHours),
      htmlSelector: form.htmlSelector || null,
      active: form.active,
    }

    try {
      if (isEditing) {
        await updateFeed.mutateAsync({ id: feed.id, data })
        toast('success', 'Feed updated')
      } else {
        await createFeed.mutateAsync(data)
        toast('success', 'Feed created')
      }
      onClose()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save feed')
    }
  }

  const isPending = createFeed.isPending || updateFeed.isPending

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-base font-semibold text-neutral-900 mb-4">
            {isEditing ? 'Edit Feed' : 'Add Feed'}
          </DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="feed-title" label="Title" value={form.title} onChange={e => set('title', e.target.value)} required />
            <Input id="feed-url" label="URL" type="url" value={form.url} onChange={e => set('url', e.target.value)} required />
            <Select
              id="feed-issue"
              label="Issue"
              placeholder="Select issue"
              value={form.issueId}
              onChange={e => set('issueId', e.target.value)}
              options={buildIssueOptions(issues)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input id="feed-lang" label="Language" value={form.language} onChange={e => set('language', e.target.value)} />
              <Input id="feed-interval" label="Interval (hours)" type="number" min="1" value={form.crawlIntervalHours} onChange={e => set('crawlIntervalHours', e.target.value)} />
            </div>
            <Input id="feed-selector" label="HTML Selector (optional)" value={form.htmlSelector} onChange={e => set('htmlSelector', e.target.value)} placeholder="e.g. article .content" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => set('active', e.target.checked)}
                className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
              Active
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={isPending}>{isEditing ? 'Save' : 'Create'}</Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
