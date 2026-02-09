import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useClusters, useDissolveClusterById } from '../../hooks/useClusters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ClusterTable } from '../../components/admin/ClusterTable'
import { ClusterDetailPanel } from '../../components/admin/ClusterDetail'
import { CreateClusterPanel } from '../../components/admin/CreateClusterPanel'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export default function ClustersPage() {
  const clustersQuery = useClusters()
  const dissolveCluster = useDissolveClusterById()
  const { toast } = useToast()

  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')
  const createParam = searchParams.get('create')

  const [showCreate, setShowCreate] = useState(false)
  const [dissolveId, setDissolveId] = useState<string | null>(null)

  // Open create panel if ?create param is present
  const isCreateOpen = showCreate || !!createParam

  const setEditingId = (id: string | null) => {
    if (id) {
      setSearchParams({ open: id })
    } else {
      setSearchParams({})
    }
  }

  const handleOpenCreate = () => {
    setShowCreate(true)
  }

  const handleCloseCreate = () => {
    setShowCreate(false)
    if (createParam) {
      setSearchParams({})
    }
  }

  const handleCreateSuccess = (clusterId: string) => {
    setShowCreate(false)
    setSearchParams({ open: clusterId })
  }

  const handleDissolve = async () => {
    if (!dissolveId) return
    try {
      await dissolveCluster.mutateAsync(dissolveId)
      toast('success', 'Cluster dissolved')
      if (openId === dissolveId) setEditingId(null)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to dissolve cluster')
    }
    setDissolveId(null)
  }

  return (
    <>
      <Helmet>
        <title>Clusters — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Clusters"
        description={clustersQuery.data ? `${clustersQuery.data.length} clusters` : undefined}
        actions={
          <Button size="sm" onClick={handleOpenCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />
            New Cluster
          </Button>
        }
      />

      {clustersQuery.isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {clustersQuery.error && <ErrorState message="Failed to load clusters" onRetry={() => clustersQuery.refetch()} />}
      {clustersQuery.data && clustersQuery.data.length === 0 && (
        <EmptyState title="No clusters" description="Story clusters are created automatically during deduplication." />
      )}
      {clustersQuery.data && clustersQuery.data.length > 0 && (
        <ClusterTable
          clusters={clustersQuery.data}
          onEdit={setEditingId}
          onDissolve={setDissolveId}
        />
      )}

      <ClusterDetailPanel
        clusterId={openId}
        onClose={() => setEditingId(null)}
      />

      <CreateClusterPanel
        open={isCreateOpen}
        onClose={handleCloseCreate}
        preSelectedStoryIds={createParam ? [createParam] : []}
        onSuccess={handleCreateSuccess}
      />

      <ConfirmDialog
        open={!!dissolveId}
        onClose={() => setDissolveId(null)}
        onConfirm={handleDissolve}
        title="Dissolve cluster?"
        description="All auto-rejected members will be restored to analyzed status. This cannot be undone."
        variant="danger"
        confirmLabel="Dissolve"
        loading={dissolveCluster.isPending}
      />
    </>
  )
}
