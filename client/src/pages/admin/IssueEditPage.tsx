import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useIssue, useCreateIssue, useUpdateIssue } from '../../hooks/useIssues'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../components/ui/Toast'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function IssueEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const { toast } = useToast()

  const issueQuery = useIssue(id || '')
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue()

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    promptFactors: '',
    promptAntifactors: '',
    promptRatings: '',
  })
  const [slugManual, setSlugManual] = useState(false)

  useEffect(() => {
    if (issueQuery.data) {
      setForm({
        name: issueQuery.data.name,
        slug: issueQuery.data.slug,
        description: issueQuery.data.description,
        promptFactors: issueQuery.data.promptFactors,
        promptAntifactors: issueQuery.data.promptAntifactors,
        promptRatings: issueQuery.data.promptRatings,
      })
      setSlugManual(true)
    }
  }, [issueQuery.data])

  const set = (key: string, value: string) => {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'name' && !slugManual) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isNew) {
        await createIssue.mutateAsync(form)
        toast('success', 'Issue created')
      } else {
        await updateIssue.mutateAsync({ id: id!, data: form })
        toast('success', 'Issue updated')
      }
      navigate('/admin/issues')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save issue')
    }
  }

  const isPending = createIssue.isPending || updateIssue.isPending

  if (!isNew && issueQuery.isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  }

  return (
    <>
      <Helmet>
        <title>{isNew ? 'New Issue' : 'Edit Issue'} — Admin — Actually Relevant</title>
      </Helmet>

      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/issues')}>
          <ArrowLeftIcon className="h-4 w-4" /> Back to Issues
        </Button>
      </div>

      <PageHeader title={isNew ? 'New Issue' : 'Edit Issue'} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
          <Input id="issue-name" label="Name" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Input
            id="issue-slug"
            label="Slug"
            value={form.slug}
            onChange={e => { setSlugManual(true); set('slug', e.target.value) }}
            required
          />
          <Textarea id="issue-desc" label="Description" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900">LLM Prompt Configuration</h3>
          <Textarea
            id="issue-factors"
            label="Relevance Factors"
            rows={8}
            value={form.promptFactors}
            onChange={e => set('promptFactors', e.target.value)}
            placeholder="What makes a story relevant for this issue?"
          />
          <Textarea
            id="issue-antifactors"
            label="Antifactors"
            rows={8}
            value={form.promptAntifactors}
            onChange={e => set('promptAntifactors', e.target.value)}
            placeholder="What makes a story less relevant?"
          />
          <Textarea
            id="issue-ratings"
            label="Rating Guidelines"
            rows={8}
            value={form.promptRatings}
            onChange={e => set('promptRatings', e.target.value)}
            placeholder="How should ratings be assigned?"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>{isNew ? 'Create Issue' : 'Save Changes'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/issues')}>Cancel</Button>
        </div>
      </form>
    </>
  )
}
