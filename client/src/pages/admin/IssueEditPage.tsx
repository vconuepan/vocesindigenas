import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useIssue, useIssues, useCreateIssue, useUpdateIssue } from '../../hooks/useIssues'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../components/ui/Toast'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface MakeADifferenceLink {
  label: string
  url: string
}

export default function IssueEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const { toast } = useToast()

  const issueQuery = useIssue(id || '')
  const issuesQuery = useIssues()
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue()

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    promptFactors: '',
    promptAntifactors: '',
    promptRatings: '',
    parentId: null as string | null,
    intro: '',
    evaluationIntro: '',
    evaluationCriteria: [] as string[],
    sourceNames: [] as string[],
    makeADifference: [] as MakeADifferenceLink[],
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
        parentId: issueQuery.data.parentId,
        intro: issueQuery.data.intro || '',
        evaluationIntro: issueQuery.data.evaluationIntro || '',
        evaluationCriteria: issueQuery.data.evaluationCriteria || [],
        sourceNames: issueQuery.data.sourceNames || [],
        makeADifference: issueQuery.data.makeADifference || [],
      })
      setSlugManual(true)
    }
  }, [issueQuery.data])

  const set = (key: string, value: any) => {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'name' && !slugManual) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  // Check if this issue has children (cannot be made a child itself)
  const hasChildren = issueQuery.data?.children && issueQuery.data.children.length > 0

  // Build parent options: only top-level issues that aren't this issue and have no parent
  const parentOptions = (issuesQuery.data || [])
    .filter(i => !i.parentId && i.id !== id)
    .map(i => ({ value: i.id, label: i.name }))

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
        {/* Basic Info */}
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
          <div>
            <Select
              id="issue-parent"
              label="Parent Issue"
              placeholder="None (top-level)"
              value={form.parentId || ''}
              onChange={e => set('parentId', e.target.value || null)}
              options={parentOptions}
              disabled={!!hasChildren}
            />
            {hasChildren && (
              <p className="mt-1 text-xs text-neutral-500">This issue has child issues and cannot be made a child itself.</p>
            )}
          </div>
        </div>

        {/* LLM Prompt Configuration */}
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

        {/* Public Page Content */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900">Public Page Content</h3>
          <Textarea
            id="issue-intro"
            label="Introduction"
            rows={4}
            value={form.intro}
            onChange={e => set('intro', e.target.value)}
            placeholder="Public-facing introduction paragraph"
          />
          <Textarea
            id="issue-eval-intro"
            label="Evaluation Introduction"
            rows={2}
            value={form.evaluationIntro}
            onChange={e => set('evaluationIntro', e.target.value)}
            placeholder="How stories in this issue are evaluated"
          />

          {/* Evaluation Criteria */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Evaluation Criteria</label>
            <div className="space-y-2">
              {form.evaluationCriteria.map((criterion, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={criterion}
                    onChange={e => {
                      const updated = [...form.evaluationCriteria]
                      updated[i] = e.target.value
                      set('evaluationCriteria', updated)
                    }}
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => set('evaluationCriteria', form.evaluationCriteria.filter((_, j) => j !== i))}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('evaluationCriteria', [...form.evaluationCriteria, ''])}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                <PlusIcon className="h-4 w-4" /> Add criterion
              </button>
            </div>
          </div>

          {/* Source Names */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Source Names</label>
            <div className="space-y-2">
              {form.sourceNames.map((source, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={source}
                    onChange={e => {
                      const updated = [...form.sourceNames]
                      updated[i] = e.target.value
                      set('sourceNames', updated)
                    }}
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => set('sourceNames', form.sourceNames.filter((_, j) => j !== i))}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('sourceNames', [...form.sourceNames, ''])}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                <PlusIcon className="h-4 w-4" /> Add source
              </button>
            </div>
          </div>

          {/* Make a Difference Links */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Make a Difference Links</label>
            <div className="space-y-2">
              {form.makeADifference.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    placeholder="Label"
                    onChange={e => {
                      const updated = [...form.makeADifference]
                      updated[i] = { ...updated[i], label: e.target.value }
                      set('makeADifference', updated)
                    }}
                    className="w-1/3 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                  <input
                    type="url"
                    value={link.url}
                    placeholder="URL"
                    onChange={e => {
                      const updated = [...form.makeADifference]
                      updated[i] = { ...updated[i], url: e.target.value }
                      set('makeADifference', updated)
                    }}
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => set('makeADifference', form.makeADifference.filter((_, j) => j !== i))}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('makeADifference', [...form.makeADifference, { label: '', url: '' }])}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                <PlusIcon className="h-4 w-4" /> Add link
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>{isNew ? 'Create Issue' : 'Save Changes'}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/issues')}>Cancel</Button>
        </div>
      </form>
    </>
  )
}
