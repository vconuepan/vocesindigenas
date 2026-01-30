import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { User } from '@shared/types'
import { useUsers, useCreateUser, useDeleteUser } from '../../hooks/useUsers'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../components/ui/Toast'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { UserEditPanel } from '../../components/admin/UserEditPanel'
import { UserTable } from '../../components/admin/UserTable'

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

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
            <Input id="create-name" label="Name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            <Input id="create-email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input id="create-password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            <Select id="create-role" label="Role" options={ROLE_OPTIONS} value={role} onChange={e => setRole(e.target.value)} />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button type="submit" loading={createUser.isPending}>Create</Button>
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
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
        <UserTable
          users={usersQuery.data}
          currentUserId={currentUser?.id}
          onEdit={setEditingUserId}
          onDelete={setDeletingUser}
        />
      )}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <UserEditPanel userId={editingUserId} onClose={() => setEditingUserId(null)} />

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
