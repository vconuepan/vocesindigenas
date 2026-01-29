import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, action, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          {title && <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}
