import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { User, UserRole } from '@shared/types'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useUsers'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../components/ui/Toast'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { BadgeVariant } from '../../lib/constants'

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  admin: 'purple',
  editor: 'blue',
  viewer: 'gray',
}

function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const createUser = useCreateUser()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('editor')
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('editor')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createUser.mutateAsync({ name, email, password, role })
      toast('success', 'User created')
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-neutral-900 mb-4">
            Create User
          </DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="create-name"
              label="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
            <Input
              id="create-email"
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              id="create-password"
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Select
              id="create-role"
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={e => setRole(e.target.value)}
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={createUser.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  onClose,
}: {
  user: User
  onClose: () => void
}) {
  const { toast } = useToast()
  const updateUser = useUpdateUser()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await updateUser.mutateAsync({ id: user.id, data: { name, role } })
      toast('success', 'User updated')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-neutral-900 mb-4">
            Edit User
          </DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="edit-name"
              label="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
            <Select
              id="edit-role"
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={updateUser.isPending}>
                Save
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const usersQuery = useUsers()
  const deleteUser = useDeleteUser()

  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteUser.mutateAsync(deletingUser.id)
      toast('success', 'User deleted')
      setDeletingUser(null)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete user')
      setDeletingUser(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <Helmet>
        <title>Users — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Users"
        description="Manage admin users and their roles."
        actions={
          <Button onClick={() => setShowCreate(true)}>Create User</Button>
        }
      />

      {usersQuery.isLoading && (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      )}
      {usersQuery.error && (
        <ErrorState message="Failed to load users" onRetry={() => usersQuery.refetch()} />
      )}
      {usersQuery.data && usersQuery.data.length === 0 && (
        <EmptyState title="No users yet" />
      )}
      {usersQuery.data && usersQuery.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {usersQuery.data.map(user => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                    {user.name}
                    {currentUser?.id === user.id && (
                      <span className="ml-2 text-xs text-neutral-400">(you)</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge variant={ROLE_BADGE[user.role as UserRole]}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={`Edit ${user.name}`}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        disabled={currentUser?.id === user.id}
                        className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Delete ${user.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {editingUser && (
        <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
      )}

      <ConfirmDialog
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        title="Delete user"
        description={`Are you sure you want to delete ${deletingUser?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteUser.isPending}
      />
    </>
  )
}
