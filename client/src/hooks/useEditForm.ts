import { useState, useMemo, useCallback } from 'react'
import { useToast } from '../components/ui/Toast'

interface UseEditFormOptions<TForm, TPayload> {
  entityId: string
  initialState: TForm
  mutation: { mutateAsync: (args: { id: string; data: TPayload }) => Promise<unknown>; isPending: boolean }
  toPayload: (form: TForm) => TPayload
  successMessage: string
  entityName: string
  onSuccess: () => void
  onFieldChange?: (key: keyof TForm, value: TForm[keyof TForm], form: TForm) => Partial<TForm> | undefined
}

export function useEditForm<TForm extends Record<string, unknown>, TPayload>({
  entityId,
  initialState,
  mutation,
  toPayload,
  successMessage,
  entityName,
  onSuccess,
  onFieldChange,
}: UseEditFormOptions<TForm, TPayload>) {
  const [form, setForm] = useState<TForm>(initialState)
  const { toast } = useToast()

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialState),
    [form, initialState],
  )

  const set = useCallback(
    <K extends keyof TForm>(key: K, value: TForm[K]) => {
      setForm(f => {
        const next = { ...f, [key]: value }
        if (onFieldChange) {
          const extra = onFieldChange(key, value, next)
          if (extra) return { ...next, ...extra }
        }
        return next
      })
    },
    [onFieldChange],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        await mutation.mutateAsync({ id: entityId, data: toPayload(form) })
        toast('success', successMessage)
        onSuccess()
      } catch (err) {
        toast('error', err instanceof Error ? err.message : `Failed to update ${entityName}`)
      }
    },
    [entityId, form, mutation, toPayload, successMessage, entityName, onSuccess, toast],
  )

  return { form, setForm, set, isDirty, isPending: mutation.isPending, handleSubmit }
}
