import React, { useMemo, useState, useCallback, type FormEvent } from 'react'
import type { UserType } from '@shared/types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useUser, useUpdateUser, useResetPassword } from '../../hooks/useUsers'
import { useEditForm } from '../../hooks/useEditForm'
import { useToast } from '../ui/Toast'
import { EditPanel, PANEL_BODY } from './EditPanel'
import { PanelFooter } from './PanelFooter'

const ROLE_OPTIONS = [
  { value: 'VEEDOR', label: 'Veedor' },
  { value: 'COMUNIDAD_LIDER', label: 'Comunidad Líder' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'ADMIN', label: 'Admin' },
]

function PasswordResetSection({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const resetPassword = useResetPassword()
  const { toast } = useToast()

  const reset = useCallback(() => {
    setPassword('')
    setConfirm('')
    setMismatch(false)
    setOpen(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (password !== confirm) {
        setMismatch(true)
        return
      }
      try {
        await resetPassword.mutateAsync({ id: userId, password })
        toast('success', 'Password updated')
        reset()
      } catch (err) {
        toast('error', err instanceof Error ? err.message : 'Failed to reset password')
      }
    },
    [userId, password, confirm, resetPassword, toast, reset],
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-brand-800 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        Set password...
      </button>
    )
  }

  const preventParentSubmit = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') e.preventDefault()
    },
    [],
  )

  return (
    <div className="border border-neutral-200 rounded-lg p-3 space-y-3">
      <p className="text-sm font-medium text-neutral-700">Set new password</p>
      <Input
        id="reset-password"
        label="New password"
        type="password"
        value={password}
        onChange={e => { setPassword(e.target.value); setMismatch(false) }}
        onKeyDown={preventParentSubmit}
        minLength={8}
        autoComplete="new-password"
      />
      <Input
        id="reset-confirm"
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={e => { setConfirm(e.target.value); setMismatch(false) }}
        onKeyDown={preventParentSubmit}
        error={mismatch ? 'Passwords do not match' : undefined}
        minLength={8}
        autoComplete="new-password"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={resetPassword.isPending || password.length < 8 || confirm.length < 8}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {resetPassword.isPending ? 'Saving...' : 'Save password'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function UserEditForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user } = useUser(userId)
  const updateUser = useUpdateUser()

  const initialState = useMemo(
    () => ({ email: user!.email, name: user!.name, userType: user!.userType }),
    [user],
  )

  const { form, set, isDirty, isPending, handleSubmit } = useEditForm({
    entityId: userId,
    initialState,
    mutation: updateUser,
    toPayload: (f) => ({ email: f.email, name: f.name, userType: f.userType }),
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
        <Input
          id="edit-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          required
        />
        <Select
          id="edit-role"
          label="Tipo de usuario"
          options={ROLE_OPTIONS}
          value={form.userType}
          onChange={e => set('userType', e.target.value as UserType)}
        />
        <PasswordResetSection userId={userId} />
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
