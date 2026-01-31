import type { JobRun } from '@shared/types'
import { Badge } from '../ui/Badge'

type Variant = 'dot' | 'badge'

interface JobStatusBadgeProps {
  job: Pick<JobRun, 'running' | 'enabled' | 'lastError' | 'lastCompletedAt'>
  variant?: Variant
}

type StatusInfo = { label: string; color: 'yellow' | 'red' | 'green' | 'gray' }

function getStatus(job: JobStatusBadgeProps['job']): StatusInfo {
  if (!job.enabled) return { label: 'Disabled', color: 'gray' }
  if (job.running) return { label: 'Running', color: 'yellow' }
  if (job.lastError) return { label: 'Error', color: 'red' }
  if (job.lastCompletedAt) return { label: 'OK', color: 'green' }
  return { label: 'Never run', color: 'gray' }
}

const dotColors = {
  yellow: 'bg-yellow-400 animate-pulse',
  red: 'bg-red-500',
  green: 'bg-green-500',
  gray: 'bg-neutral-300',
}

function Spinner() {
  return (
    <svg className="inline-block h-3.5 w-3.5 animate-spin text-yellow-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function JobStatusBadge({ job, variant = 'badge' }: JobStatusBadgeProps) {
  const status = getStatus(job)

  if (variant === 'dot') {
    if (job.running) {
      return <Spinner />
    }
    return (
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${dotColors[status.color]}`}
        title={status.label}
      />
    )
  }

  if (job.running) {
    return (
      <Badge variant="yellow" className="animate-pulse gap-1.5">
        <Spinner />
        Running
      </Badge>
    )
  }

  return <Badge variant={status.color}>{status.label}</Badge>
}
