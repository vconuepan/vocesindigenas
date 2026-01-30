import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { User, UserRole } from '@shared/types'
import { Badge } from '../ui/Badge'
import { ActionIconButton } from '../ui/ActionIconButton'
import type { BadgeVariant } from '../../lib/constants'
import { formatShortDate } from '../../lib/constants'

const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  admin: 'purple',
  editor: 'blue',
  viewer: 'gray',
}

interface UserTableProps {
  users: User[]
  currentUserId?: string
  onEdit: (id: string) => void
  onDelete: (user: User) => void
}

export function UserTable({ users, currentUserId, onEdit, onDelete }: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Name</th>
            <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Email</th>
            <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Role</th>
            <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Created</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {users.map(user => {
            const isSelf = currentUserId === user.id
            return (
              <tr key={user.id} className="hover:bg-neutral-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <button
                    onClick={() => onEdit(user.id)}
                    className="font-medium text-neutral-900 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {user.name}
                  </button>
                  {isSelf && (
                    <span className="ml-2 text-xs text-neutral-400">(you)</span>
                  )}
                  {/* Mobile metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
                    <span className="text-neutral-500 text-xs">{user.email}</span>
                    <Badge variant={ROLE_BADGE[user.role as UserRole]}>
                      {user.role}
                    </Badge>
                  </div>
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                  {user.email}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-sm">
                  <Badge variant={ROLE_BADGE[user.role as UserRole]}>
                    {user.role}
                  </Badge>
                </td>
                <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                  {formatShortDate(user.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {/* Desktop actions */}
                  <div className="hidden md:flex items-center justify-end gap-0.5">
                    <ActionIconButton
                      icon={PencilSquareIcon}
                      label="Edit"
                      onClick={() => onEdit(user.id)}
                    />
                    <ActionIconButton
                      icon={TrashIcon}
                      label={`Delete ${user.name}`}
                      variant="danger"
                      disabled={isSelf}
                      onClick={() => onDelete(user)}
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
                            onClick={() => onEdit(user.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                          >
                            <PencilSquareIcon className="h-4 w-4 shrink-0" />
                            Edit
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => onDelete(user)}
                            disabled={isSelf}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 data-[focus]:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="h-4 w-4 shrink-0" />
                            Delete
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
