import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import type { Story, StoryStatus } from '@shared/types'
import { Badge } from '../ui/Badge'
import { STATUS_VARIANTS, EMOTION_VARIANTS, formatStatus, formatDate } from '../../lib/constants'

interface StoryTableProps {
  stories: Story[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
  onView: (id: string) => void
  onStatusChange: (id: string, status: StoryStatus) => void
  onDelete: (id: string) => void
}

export function StoryTable({
  stories,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onView,
  onStatusChange,
  onDelete,
}: StoryTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected && stories.length > 0}
                onChange={onToggleSelectAll}
                className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                aria-label="Select all stories"
              />
            </th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Rating</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Emotion</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Crawled</th>
            <th className="w-10 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {stories.map(story => (
            <tr
              key={story.id}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(story.id)}
                  onChange={() => onToggleSelect(story.id)}
                  className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                  aria-label={`Select ${story.title || story.sourceTitle}`}
                />
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onView(story.id)}
                  className="text-left font-medium text-neutral-900 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {story.title || story.sourceTitle}
                </button>
              </td>
              <td className="px-3 py-2">
                <Badge variant={STATUS_VARIANTS[story.status]}>{formatStatus(story.status)}</Badge>
              </td>
              <td className="px-3 py-2 text-neutral-600">
                {story.relevance != null
                  ? String(story.relevance)
                  : story.relevancePre != null
                    ? `(${story.relevancePre})`
                    : '—'}
              </td>
              <td className="px-3 py-2">
                {story.emotionTag ? (
                  <Badge variant={EMOTION_VARIANTS[story.emotionTag]}>
                    {story.emotionTag}
                  </Badge>
                ) : '—'}
              </td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">
                {formatDate(story.dateCrawled)}
              </td>
              <td className="px-3 py-2">
                <Menu as="div" className="relative">
                  <MenuButton className="rounded p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                    <EllipsisVerticalIcon className="h-5 w-5 text-neutral-400" />
                  </MenuButton>
                  <MenuItems className="absolute right-0 z-10 mt-1 w-40 rounded-md bg-white shadow-lg border border-neutral-200 py-1 focus:outline-none">
                    <MenuItem>
                      <button
                        onClick={() => onView(story.id)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                      >
                        View Details
                      </button>
                    </MenuItem>
                    {story.status !== 'published' && (
                      <MenuItem>
                        <button
                          onClick={() => onStatusChange(story.id, 'published')}
                          className="block w-full text-left px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                        >
                          Publish
                        </button>
                      </MenuItem>
                    )}
                    {story.status !== 'rejected' && (
                      <MenuItem>
                        <button
                          onClick={() => onStatusChange(story.id, 'rejected')}
                          className="block w-full text-left px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                        >
                          Reject
                        </button>
                      </MenuItem>
                    )}
                    {story.status !== 'trashed' && (
                      <MenuItem>
                        <button
                          onClick={() => onStatusChange(story.id, 'trashed')}
                          className="block w-full text-left px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                        >
                          Trash
                        </button>
                      </MenuItem>
                    )}
                    <MenuItem>
                      <button
                        onClick={() => onDelete(story.id)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-red-600 data-[focus]:bg-red-50"
                      >
                        Delete
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
