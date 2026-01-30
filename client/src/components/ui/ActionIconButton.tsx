import type { ComponentType, SVGProps } from 'react'

interface ActionIconButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  className?: string
}

const VARIANT_CLASSES = {
  default: 'text-neutral-400 hover:text-neutral-600',
  danger: 'text-neutral-400 hover:text-red-600',
}

export function ActionIconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  className = '',
}: ActionIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-30 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
