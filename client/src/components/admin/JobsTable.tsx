import { useState } from 'react'
import type { JobRun } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { JOB_DISPLAY_NAMES, JOB_PIPELINE_ORDER, formatDate } from '../../lib/constants'
import { useUpdateJob, useRunJob } from '../../hooks/useJobs'
import { useToast } from '../ui/Toast'
import { CronEditor } from './CronEditor'

interface JobsTableProps {
  jobs: JobRun[]
}

function JobStatusDot({ job }: { job: JobRun }) {
  if (!job.enabled) return <Badge variant="gray">Disabled</Badge>

  const started = job.lastStartedAt ? new Date(job.lastStartedAt).getTime() : 0
  const completed = job.lastCompletedAt ? new Date(job.lastCompletedAt).getTime() : 0

  if (started > completed) return <Badge variant="yellow">Running</Badge>
  if (job.lastError) return <Badge variant="red">Error</Badge>
  if (job.lastCompletedAt) return <Badge variant="green">OK</Badge>
  return <Badge variant="gray">Never run</Badge>
}

export function JobsTable({ jobs }: JobsTableProps) {
  const updateJob = useUpdateJob()
  const runJob = useRunJob()
  const { toast } = useToast()
  const [expandedError, setExpandedError] = useState<string | null>(null)

  const sortedJobs = [...jobs].sort((a, b) => {
    const ai = JOB_PIPELINE_ORDER.indexOf(a.jobName)
    const bi = JOB_PIPELINE_ORDER.indexOf(b.jobName)
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
  })

  const handleToggleEnabled = (job: JobRun) => {
    updateJob.mutate(
      { jobName: job.jobName, data: { enabled: !job.enabled } },
      {
        onSuccess: () => toast('success', `${JOB_DISPLAY_NAMES[job.jobName]} ${!job.enabled ? 'enabled' : 'disabled'}`),
        onError: () => toast('error', 'Failed to update job'),
      },
    )
  }

  const handleRun = (jobName: string) => {
    runJob.mutate(jobName, {
      onSuccess: () => toast('success', `${JOB_DISPLAY_NAMES[jobName as keyof typeof JOB_DISPLAY_NAMES] || jobName} triggered`),
      onError: () => toast('error', 'Failed to trigger job'),
    })
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Job</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Cron</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Enabled</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Last Started</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Last Completed</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Error</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map(job => (
            <tr key={job.jobName} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2 font-medium text-neutral-900">
                {JOB_DISPLAY_NAMES[job.jobName] || job.jobName}
              </td>
              <td className="px-3 py-2">
                <CronEditor job={job} />
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleToggleEnabled(job)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    job.enabled ? 'bg-brand-600' : 'bg-neutral-300'
                  }`}
                  role="switch"
                  aria-checked={job.enabled}
                  aria-label={`${job.enabled ? 'Disable' : 'Enable'} ${JOB_DISPLAY_NAMES[job.jobName]}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${job.enabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </td>
              <td className="px-3 py-2"><JobStatusDot job={job} /></td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{formatDate(job.lastStartedAt)}</td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{formatDate(job.lastCompletedAt)}</td>
              <td className="px-3 py-2 max-w-[200px]">
                {job.lastError ? (
                  <button
                    onClick={() => setExpandedError(expandedError === job.jobName ? null : job.jobName)}
                    className="text-left text-red-600 text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {expandedError === job.jobName ? job.lastError : `${job.lastError.slice(0, 60)}...`}
                  </button>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRun(job.jobName)}
                  loading={runJob.isPending && runJob.variables === job.jobName}
                >
                  Run Now
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
