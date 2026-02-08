import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { StoryCluster } from '@shared/types'
import { ActionIconButton } from '../ui/ActionIconButton'
import { formatDateWithTime } from '../../lib/constants'

interface ClusterTableProps {
  clusters: StoryCluster[]
  onEdit: (id: string) => void
  onDissolve: (id: string) => void
}

export function ClusterTable({ clusters, onEdit, onDissolve }: ClusterTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Primary Story</th>
            <th scope="col" className="hidden md:table-cell text-center px-3 py-2 font-medium text-neutral-500">Members</th>
            <th scope="col" className="hidden md:table-cell text-left px-3 py-2 font-medium text-neutral-500">Created</th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map(cluster => {
            const primaryTitle = cluster.primaryStory?.title || cluster.primaryStory?.sourceTitle || 'No primary'
            return (
              <tr key={cluster.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <button
                    onClick={() => onEdit(cluster.id)}
                    className="text-left font-medium text-neutral-900 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {primaryTitle}
                  </button>
                  {/* Mobile metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {cluster._count.stories} stories
                    </span>
                    <span className="text-neutral-400 text-xs">{formatDateWithTime(cluster.createdAt)}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 py-2 text-center">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    {cluster._count.stories}
                  </span>
                </td>
                <td className="hidden md:table-cell px-3 py-2 text-neutral-500 whitespace-nowrap">
                  {formatDateWithTime(cluster.createdAt)}
                </td>
                <td className="px-3 py-2">
                  {/* Desktop actions */}
                  <div className="hidden md:flex items-center justify-end gap-0.5">
                    <ActionIconButton
                      icon={PencilSquareIcon}
                      label="Edit"
                      onClick={() => onEdit(cluster.id)}
                    />
                    <ActionIconButton
                      icon={TrashIcon}
                      label="Dissolve"
                      variant="danger"
                      onClick={() => onDissolve(cluster.id)}
                    />
                  </div>

                  {/* Mobile overflow menu */}
                  <div className="md:hidden flex justify-end">
                    <Menu as="div" className="relative">
                      <MenuButton className="rounded p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                        <EllipsisVerticalIcon className="h-5 w-5 text-neutral-400" />
                      </MenuButton>
                      <MenuItems className="absolute right-0 z-10 mt-1 w-40 rounded-md bg-white shadow-lg border border-neutral-200 py-1 focus:outline-none">
                        <MenuItem>
                          <button
                            onClick={() => onEdit(cluster.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                          >
                            <PencilSquareIcon className="h-4 w-4 shrink-0" />
                            Edit
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => onDissolve(cluster.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 data-[focus]:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4 shrink-0" />
                            Dissolve
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
