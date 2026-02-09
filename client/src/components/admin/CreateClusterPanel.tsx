import { useState, useMemo, useEffect, useRef } from 'react'
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import type { ClusterStorySearchResult } from '@shared/types'
import { useCreateCluster, useClusterStorySearch } from '../../hooks/useClusters'
import { adminApi } from '../../lib/admin-api'
import { EditPanel, PANEL_BODY, PANEL_FOOTER } from './EditPanel'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import { formatStatus } from '../../lib/constants'
import { useDebounce } from '../../hooks/useDebounce'

interface CreateClusterPanelProps {
  open: boolean
  onClose: () => void
  preSelectedStoryIds?: string[]
  onSuccess?: (clusterId: string) => void
}

export function CreateClusterPanel({ open, onClose, preSelectedStoryIds = [], onSuccess }: CreateClusterPanelProps) {
  const [searchText, setSearchText] = useState('')
  const debouncedSearch = useDebounce(searchText, 300)
  const [selectedStories, setSelectedStories] = useState<ClusterStorySearchResult[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const preSelectedLoadedRef = useRef(false)

  const createCluster = useCreateCluster()
  const { data: searchResults, isLoading: isSearching } = useClusterStorySearch(debouncedSearch)
  const { toast } = useToast()

  // Load pre-selected stories when the panel opens
  useEffect(() => {
    if (!open || preSelectedStoryIds.length === 0 || preSelectedLoadedRef.current) return
    preSelectedLoadedRef.current = true

    // Search for each pre-selected story by fetching from the search endpoint
    Promise.all(
      preSelectedStoryIds.map(id =>
        adminApi.clusters.searchStories(id).then(results => results.find(s => s.id === id)),
      ),
    ).then(results => {
      const found = results.filter((s): s is ClusterStorySearchResult => s != null)
      if (found.length > 0) {
        setSelectedStories(found)
        setPrimaryId(found[0].id)
      }
    })
  }, [open, preSelectedStoryIds])

  // Reset state when panel closes
  useEffect(() => {
    if (!open) {
      preSelectedLoadedRef.current = false
    }
  }, [open])

  const selectedIds = useMemo(() => new Set(selectedStories.map(s => s.id)), [selectedStories])

  const filteredResults = useMemo(() => {
    if (!searchResults) return []
    return searchResults.filter(s => !selectedIds.has(s.id))
  }, [searchResults, selectedIds])

  const canCreate = selectedStories.length >= 2 && primaryId !== null

  const handleSelect = (story: ClusterStorySearchResult) => {
    if (story.clusterId) return
    setSelectedStories(prev => {
      if (prev.length === 0) {
        setPrimaryId(story.id)
      }
      return [...prev, story]
    })
  }

  const handleDeselect = (storyId: string) => {
    setSelectedStories(prev => {
      const remaining = prev.filter(s => s.id !== storyId)
      if (primaryId === storyId) {
        setPrimaryId(remaining.length > 0 ? remaining[0].id : null)
      }
      return remaining
    })
  }

  const handleCreate = () => {
    if (!canCreate || !primaryId) return
    const storyIds = selectedStories.map(s => s.id)
    createCluster.mutate({ storyIds, primaryStoryId: primaryId }, {
      onSuccess: (cluster) => {
        toast('success', `Cluster created with ${selectedStories.length} stories`)
        setSelectedStories([])
        setPrimaryId(null)
        setSearchText('')
        onSuccess?.(cluster.id)
        onClose()
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : 'Failed to create cluster')
      },
    })
  }

  const handleClose = () => {
    if (!createCluster.isPending) {
      setSelectedStories([])
      setPrimaryId(null)
      setSearchText('')
      onClose()
    }
  }

  return (
    <EditPanel open={open} onClose={handleClose} title="Create Cluster">
      <div className={PANEL_BODY}>
        {/* Selected stories */}
        {selectedStories.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Selected Stories ({selectedStories.length})
            </h3>
            <ul className="space-y-2">
              {selectedStories.map(story => {
                const isPrimary = story.id === primaryId
                return (
                  <li key={story.id} className="rounded-md border border-neutral-200 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {story.title || story.sourceTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-500">{formatStatus(story.status)}</span>
                          {story.relevance != null && (
                            <span className="text-xs text-neutral-500">Rating: {story.relevance}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPrimaryId(story.id)}
                          title={isPrimary ? 'Primary story' : 'Make primary'}
                          className={`rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            isPrimary
                              ? 'text-green-700'
                              : 'text-neutral-400 hover:text-green-700 hover:bg-neutral-100'
                          }`}
                        >
                          {isPrimary ? <StarSolidIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeselect(story.id)}
                          title="Remove"
                          className="rounded p-1 hover:bg-neutral-100 text-neutral-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Search */}
        <div>
          <label htmlFor="cluster-story-search" className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 block">
            Search Stories
          </label>
          <input
            id="cluster-story-search"
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Search results */}
        {debouncedSearch.length >= 2 && (
          <div aria-live="polite">
            {isSearching && (
              <p className="text-sm text-neutral-500">Searching...</p>
            )}
            {!isSearching && filteredResults.length === 0 && searchResults && (
              <p className="text-sm text-neutral-500">No stories found</p>
            )}
            {filteredResults.length > 0 && (
              <ul className="space-y-1">
                {filteredResults.map(story => {
                  const isAlreadyClustered = story.clusterId !== null
                  return (
                    <li key={story.id}>
                      <button
                        onClick={() => handleSelect(story)}
                        disabled={isAlreadyClustered}
                        title={isAlreadyClustered ? 'Already in a cluster' : 'Add to cluster'}
                        className={`w-full text-left rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          isAlreadyClustered
                            ? 'opacity-50 cursor-not-allowed bg-neutral-50'
                            : 'hover:bg-neutral-100 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate flex-1 font-medium text-neutral-900">
                            {story.title || story.sourceTitle}
                          </span>
                          {isAlreadyClustered && <Badge variant="purple">Clustered</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-500">{story.sourceTitle}</span>
                          <span className="text-xs text-neutral-500">{formatStatus(story.status)}</span>
                          {story.relevance != null && (
                            <span className="text-xs text-neutral-500">Rating: {story.relevance}</span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* Validation messages */}
        {selectedStories.length > 0 && selectedStories.length < 2 && (
          <p className="text-xs text-amber-600">Select at least 2 stories to create a cluster</p>
        )}
      </div>

      <div className={PANEL_FOOTER}>
        <Button variant="secondary" onClick={handleClose} disabled={createCluster.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!canCreate || createCluster.isPending}
          loading={createCluster.isPending}
        >
          Create Cluster
        </Button>
      </div>
    </EditPanel>
  )
}
