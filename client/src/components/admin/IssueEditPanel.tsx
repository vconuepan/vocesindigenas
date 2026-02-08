import { useState, useMemo } from 'react'
import type { Issue } from '@shared/types'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { useIssue, useIssues, useUpdateIssue } from '../../hooks/useIssues'
import { useEditForm } from '../../hooks/useEditForm'
import { EditPanel, PANEL_BODY } from './EditPanel'
import { PanelFooter } from './PanelFooter'
import { ArrayField } from './ArrayField'

interface MakeADifferenceLink {
  label: string
  url: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildFormState(issue: Issue) {
  return {
    name: issue.name,
    slug: issue.slug,
    description: issue.description,
    promptFactors: issue.promptFactors,
    promptAntifactors: issue.promptAntifactors,
    promptRatings: issue.promptRatings,
    parentId: issue.parentId as string | null,
    minPreRating: issue.minPreRating as number | null,
    intro: issue.intro || '',
    evaluationIntro: issue.evaluationIntro || '',
    evaluationCriteria: issue.evaluationCriteria || [] as string[],
    makeADifference: issue.makeADifference || [] as MakeADifferenceLink[],
  }
}

const TEXT_INPUT_CLASS = 'flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500'

function IssueEditForm({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const [slugManual, setSlugManual] = useState(true)
  const issuesQuery = useIssues()
  const updateIssue = useUpdateIssue()

  const initialState = useMemo(() => buildFormState(issue), [issue])

  const { form, set, isDirty, isPending, handleSubmit } = useEditForm({
    entityId: issue.id,
    initialState,
    mutation: updateIssue,
    toPayload: (f) => f,
    successMessage: 'Issue updated',
    entityName: 'issue',
    onSuccess: onClose,
    onFieldChange: (key, value, _next) => {
      if (key === 'name' && !slugManual) {
        return { slug: slugify(value as string) }
      }
      return undefined
    },
  })

  const hasChildren = issue.children && issue.children.length > 0
  const parentOptions = (issuesQuery.data || [])
    .filter(i => !i.parentId && i.id !== issue.id)
    .map(i => ({ value: i.id, label: i.name }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className={PANEL_BODY}>
      {/* Basic Info */}
      <div className="space-y-4">
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
            onChange={e => set('parentId', (e.target.value || null) as string | null)}
            options={parentOptions}
            disabled={!!hasChildren}
          />
          {hasChildren && (
            <p className="mt-1 text-xs text-neutral-500">This issue has child issues and cannot be made a child itself.</p>
          )}
        </div>
      </div>

      {/* LLM Prompt Configuration */}
      <div className="border-t border-neutral-200 pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">LLM Prompt Configuration</h3>
        <Input
          id="issue-min-pre-rating"
          label="Min Pre-Rating"
          type="number"
          min={1}
          max={10}
          placeholder="Global default (5)"
          value={form.minPreRating ?? ''}
          onChange={e => set('minPreRating', e.target.value === '' ? null : parseInt(e.target.value, 10))}
        />
        <Textarea id="issue-factors" label="Relevance Factors" rows={6} value={form.promptFactors} onChange={e => set('promptFactors', e.target.value)} placeholder="What makes a story relevant for this issue?" />
        <Textarea id="issue-antifactors" label="Antifactors" rows={6} value={form.promptAntifactors} onChange={e => set('promptAntifactors', e.target.value)} placeholder="What makes a story less relevant?" />
        <Textarea id="issue-ratings" label="Rating Guidelines" rows={6} value={form.promptRatings} onChange={e => set('promptRatings', e.target.value)} placeholder="How should ratings be assigned?" />
      </div>

      {/* Public Page Content */}
      <div className="border-t border-neutral-200 pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">Public Page Content</h3>
        <Textarea id="issue-intro" label="Introduction" rows={3} value={form.intro} onChange={e => set('intro', e.target.value)} placeholder="Public-facing introduction paragraph" />
        <Textarea id="issue-eval-intro" label="Evaluation Introduction" rows={2} value={form.evaluationIntro} onChange={e => set('evaluationIntro', e.target.value)} placeholder="How stories in this issue are evaluated" />

        <ArrayField
          label="Evaluation Criteria"
          items={form.evaluationCriteria}
          onChange={(items) => set('evaluationCriteria', items)}
          createEmpty={() => ''}
          addLabel="Add criterion"
          renderItem={(item, _i, onItemChange) => (
            <input
              type="text"
              value={item}
              onChange={e => onItemChange(e.target.value)}
              className={TEXT_INPUT_CLASS}
            />
          )}
        />

        {issue.sourceNames && issue.sourceNames.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Sources</label>
            <p className="text-xs text-neutral-500 mb-2">Derived from active feed titles. Edit feed names to change these.</p>
            <div className="flex flex-wrap gap-1.5">
              {issue.sourceNames.map((source: string) => (
                <span
                  key={source}
                  className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        <ArrayField<MakeADifferenceLink>
          label="Make a Difference Links"
          items={form.makeADifference}
          onChange={(items) => set('makeADifference', items)}
          createEmpty={() => ({ label: '', url: '' })}
          addLabel="Add link"
          renderItem={(item, _i, onItemChange) => (
            <>
              <input
                type="text"
                value={item.label}
                placeholder="Label"
                onChange={e => onItemChange({ ...item, label: e.target.value })}
                className={`w-1/3 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500`}
              />
              <input
                type="url"
                value={item.url}
                placeholder="URL"
                onChange={e => onItemChange({ ...item, url: e.target.value })}
                className={TEXT_INPUT_CLASS}
              />
            </>
          )}
        />
      </div>
      </div>
      <PanelFooter isPending={isPending} isDirty={isDirty} onCancel={onClose} />
    </form>
  )
}

interface IssueEditPanelProps {
  issueId: string | null
  onClose: () => void
}

export function IssueEditPanel({ issueId, onClose }: IssueEditPanelProps) {
  const { data: issue, isLoading, error } = useIssue(issueId || '')

  return (
    <EditPanel
      open={!!issueId}
      onClose={onClose}
      title={issue?.name || 'Issue'}
      loading={isLoading}
      error={!!error}
    >
      {issue && <IssueEditForm issue={issue} onClose={onClose} />}
    </EditPanel>
  )
}
