import type { ReactNode } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ArrayFieldProps<T> {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  createEmpty: () => T
  addLabel: string
  renderItem: (item: T, index: number, onItemChange: (value: T) => void) => ReactNode
}

export function ArrayField<T>({
  label,
  items,
  onChange,
  createEmpty,
  addLabel,
  renderItem,
}: ArrayFieldProps<T>) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            {renderItem(item, i, (value) => {
              const updated = [...items]
              updated[i] = value
              onChange(updated)
            })}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1.5 text-neutral-400 hover:text-red-500"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, createEmpty()])}
          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          <PlusIcon className="h-4 w-4" /> {addLabel}
        </button>
      </div>
    </div>
  )
}
