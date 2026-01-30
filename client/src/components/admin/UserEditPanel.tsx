import { useMemo } from 'react'
import type { UserRole } from '@shared/types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useUser, useUpdateUser } from '../../hooks/useUsers'
import { useEditForm } from '../../hooks/useEditForm'
import { EditPanel, PANEL_BODY } from './EditPanel'
import { PanelFooter } from './PanelFooter'

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

function UserEditForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user } = useUser(userId)
  const updateUser = useUpdateUser()

  const initialState = useMemo(
    () => ({ name: user!.name, role: user!.role }),
    [user],
  )

  const { form, set, isDirty, isPending, handleSubmit } = useEditForm({
    entityId: userId,
    initialState,
    mutation: updateUser,
    toPayload: (f) => ({ name: f.name, role: f.role }),
    successMessage: 'User updated',
    entityName: 'user',
    onSuccess: onClose,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className={PANEL_BODY}>
        <Input
          id="edit-name"
          label="Name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
          <p className="text-sm text-neutral-500">{user!.email}</p>
        </div>
        <Select
          id="edit-role"
          label="Role"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={e => set('role', e.target.value as UserRole)}
        />
      </div>
      <PanelFooter isPending={isPending} isDirty={isDirty} onCancel={onClose} />
    </form>
  )
}

interface UserEditPanelProps {
  userId: string | null
  onClose: () => void
}

export function UserEditPanel({ userId, onClose }: UserEditPanelProps) {
  const { data: user, isLoading, error } = useUser(userId || '')

  return (
    <EditPanel
      open={!!userId}
      onClose={onClose}
      title={user?.name || 'User'}
      loading={isLoading}
      error={!!error}
    >
      {user && <UserEditForm userId={userId!} onClose={onClose} />}
    </EditPanel>
  )
}
