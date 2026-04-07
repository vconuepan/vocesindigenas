import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useIssues, useDeleteIssue } from '../../hooks/useIssues'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { IssueTable } from '../../components/admin/IssueTable'
import { IssueEditPanel } from '../../components/admin/IssueEditPanel'
import { useToast } from '../../components/ui/Toast'

export default function IssuesPage() {
  const issuesQuery = useIssues()
  const deleteIssue = useDeleteIssue()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteIssue.mutateAsync(deleteId)
      toast('success', 'Issue deleted')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete issue')
    }
    setDeleteId(null)
  }

  return (
    <>
      <Helmet>
        <title>Issues — Admin — Impacto Indígena</title>
      </Helmet>

      <PageHeader
        title="Issues"
        description={issuesQuery.data ? `${issuesQuery.data.length} issues` : undefined}
        actions={<Button onClick={() => navigate('/admin/issues/new')}>Add Issue</Button>}
      />

      {issuesQuery.isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {issuesQuery.error && <ErrorState message="Failed to load issues" onRetry={() => issuesQuery.refetch()} />}
      {issuesQuery.data && issuesQuery.data.length === 0 && <EmptyState title="No issues yet" description="Create your first issue." />}
      {issuesQuery.data && issuesQuery.data.length > 0 && (
        <IssueTable
          issues={issuesQuery.data}
          onEdit={setEditingIssueId}
          onDelete={setDeleteId}
        />
      )}

      <IssueEditPanel
        issueId={editingIssueId}
        onClose={() => setEditingIssueId(null)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete issue?"
        description="This will remove the issue. Feeds must be reassigned first."
        variant="danger"
        confirmLabel="Delete"
        loading={deleteIssue.isPending}
      />
    </>
  )
}
