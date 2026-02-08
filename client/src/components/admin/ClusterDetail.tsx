import { useState } from 'react'
import { StarIcon, XMarkIcon as XCircleIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import type { StoryStatus } from '@shared/types'
import {
  useCluster,
  useSetClusterPrimary,
  useRemoveClusterMember,
  useMergeClusters,
  useDissolveClusterById,
} from '../../hooks/useClusters'
import { useClusters } from '../../hooks/useClusters'
import { EditPanel, PANEL_BODY } from './EditPanel'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { formatStatus, formatDateWithTime } from '../../lib/constants'

interface ClusterDetailProps {
  clusterId: string | null
  onClose: () => void
}

function ClusterDetailContent({ clusterId, onClose }: { clusterId: string; onClose: () => void }) {
  const { data: cluster } = useCluster(clusterId)
  const { data: allClusters } = useClusters()
  const setPrimary = useSetClusterPrimary()
  const removeMember = useRemoveClusterMember()
  const mergeClusters = useMergeClusters()
  const dissolveCluster = useDissolveClusterById()
  const { toast } = useToast()

  const [mergeTargetId, setMergeTargetId] = useState('')
  const [confirmDissolve, setConfirmDissolve] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  if (!cluster) return null

  const otherClusters = allClusters?.filter(c => c.id !== clusterId) || []

  const handleSetPrimary = (storyId: string) => {
    setPrimary.mutate({ id: clusterId, storyId }, {
      onSuccess: () => toast('success', 'Primary story updated'),
      onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to update primary'),
    })
  }

  const handleRemoveMember = (storyId: string) => {
    removeMember.mutate({ id: clusterId, storyId }, {
      onSuccess: (result) => {
        if ('dissolved' in result) {
          toast('success', 'Story removed; cluster dissolved (too few members)')
          onClose()
        } else {
          toast('success', 'Story removed from cluster')
        }
        setConfirmRemoveId(null)
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : 'Failed to remove member')
        setConfirmRemoveId(null)
      },
    })
  }

  const handleMerge = () => {
    if (!mergeTargetId) return
    mergeClusters.mutate({ targetId: clusterId, sourceId: mergeTargetId }, {
      onSuccess: () => {
        toast('success', 'Clusters merged')
        setMergeTargetId('')
      },
      onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to merge clusters'),
    })
  }

  const handleDissolve = () => {
    dissolveCluster.mutate(clusterId, {
      onSuccess: () => {
        toast('success', 'Cluster dissolved')
        onClose()
      },
      onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to dissolve cluster'),
    })
  }

  return (
    <div className={PANEL_BODY}>
      {/* Primary story */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Primary Story</h3>
        <p className="text-sm text-neutral-900 font-medium">
          {cluster.primaryStory?.title || cluster.primaryStory?.sourceTitle || 'None set'}
        </p>
      </div>

      {/* Members list */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Members ({cluster.stories.length})
        </h3>
        <ul className="space-y-2">
          {cluster.stories.map(story => {
            const isPrimary = story.id === cluster.primaryStoryId
            return (
              <li key={story.id} className="rounded-md border border-neutral-200 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {story.title || story.sourceTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">{formatStatus(story.status as StoryStatus)}</span>
                      {story.relevance != null && (
                        <span className="text-xs text-neutral-500">Rating: {story.relevance}</span>
                      )}
                      {isPrimary && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700">
                          <StarSolidIcon className="h-3 w-3" />
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(story.id)}
                        disabled={setPrimary.isPending}
                        title="Make primary"
                        className="rounded p-1 hover:bg-neutral-100 text-neutral-400 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
                      >
                        <StarIcon className="h-4 w-4" />
                      </button>
                    )}
                    {confirmRemoveId === story.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemoveMember(story.id)}
                          disabled={removeMember.isPending}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {removeMember.isPending ? 'Removing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-xs text-neutral-500 hover:text-neutral-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(story.id)}
                        title="Remove from cluster"
                        className="rounded p-1 hover:bg-neutral-100 text-neutral-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Merge section */}
      {otherClusters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Merge</h3>
          <p className="text-xs text-neutral-500 mb-2">
            Merge another cluster into this one. The source cluster will be deleted.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={mergeTargetId}
              onChange={e => setMergeTargetId(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select cluster...</option>
              {otherClusters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.primaryStory?.title || c.primaryStory?.sourceTitle || c.id.slice(0, 8)} ({c._count.stories} stories)
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleMerge}
              disabled={!mergeTargetId || mergeClusters.isPending}
              loading={mergeClusters.isPending}
            >
              Merge
            </Button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="border-t border-neutral-200 pt-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-neutral-500">Created</dt>
          <dd className="text-neutral-900">{formatDateWithTime(cluster.createdAt)}</dd>
          <dt className="text-neutral-500">Updated</dt>
          <dd className="text-neutral-900">{formatDateWithTime(cluster.updatedAt)}</dd>
        </dl>
      </div>

      {/* Dissolve */}
      <div className="border-t border-neutral-200 pt-4">
        {confirmDissolve ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Dissolve cluster and restore members?</span>
            <button
              onClick={handleDissolve}
              disabled={dissolveCluster.isPending}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {dissolveCluster.isPending ? 'Dissolving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmDissolve(false)}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDissolve(true)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Dissolve cluster
          </button>
        )}
      </div>
    </div>
  )
}

export function ClusterDetailPanel({ clusterId, onClose }: ClusterDetailProps) {
  const { data: cluster, isLoading, error } = useCluster(clusterId || '')

  return (
    <EditPanel
      open={!!clusterId}
      onClose={onClose}
      title={cluster?.primaryStory?.title || cluster?.primaryStory?.sourceTitle || 'Cluster'}
      loading={isLoading}
      error={!!error}
    >
      {cluster && <ClusterDetailContent clusterId={clusterId!} onClose={onClose} />}
    </EditPanel>
  )
}
