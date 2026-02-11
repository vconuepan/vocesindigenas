import { useState } from 'react'
import {
  EllipsisVerticalIcon,
  PlayIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import type { JobRun } from '@shared/types'
import { ActionIconButton } from '../ui/ActionIconButton'
import { Button } from '../ui/Button'
import { JOB_DISPLAY_NAMES, JOB_PIPELINE_ORDER } from '../../lib/constants'
import { TimeWithRelative } from './TimeWithRelative'
import { useUpdateJob, useRunJob } from '../../hooks/useJobs'
import { useToast } from '../ui/Toast'
import { CronEditor } from './CronEditor'
import { JobStatusBadge } from './JobStatusBadge'
import { EditPanel, PANEL_BODY, PANEL_FOOTER } from './EditPanel'

interface JobsTableProps {
  jobs: JobRun[]
}

function RunningSpinner({ size = 'h-5 w-5' }: { size?: string }) {
  return (
    <svg className={`${size} animate-spin text-yellow-600`} viewBox="0 0 24 24" fill="none" aria-label="Running">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function JobEditPanel({ job, onClose }: { job: JobRun; onClose: () => void }) {
  return (
    <EditPanel open onClose={onClose} title={JOB_DISPLAY_NAMES[job.jobName] || job.jobName}>
      <div className={PANEL_BODY}>
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
          <JobStatusBadge job={job} />
        </div>

        {/* Enabled toggle */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Enabled</label>
          <EnabledToggle job={job} />
        </div>

        {/* Schedule — opens in edit mode directly */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Schedule</label>
          <CronEditor job={job} initialEditing />
        </div>

        {/* Last Started */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Last Started</label>
          <p className="text-sm text-neutral-600"><TimeWithRelative dateStr={job.lastStartedAt} /></p>
        </div>

        {/* Last Completed */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Last Completed</label>
          <p className="text-sm text-neutral-600"><TimeWithRelative dateStr={job.lastCompletedAt} /></p>
        </div>

        {/* Error */}
        {job.lastError && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Last Error</label>
            <p className="text-sm text-red-600 whitespace-pre-wrap break-words">{job.lastError}</p>
          </div>
        )}
      </div>

      <div className={PANEL_FOOTER}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </EditPanel>
  )
}

export function JobsTable({ jobs }: JobsTableProps) {
  const runJob = useRunJob()
  const { toast } = useToast()
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  const sortedJobs = [...jobs].sort((a, b) => {
    const ai = JOB_PIPELINE_ORDER.indexOf(a.jobName)
    const bi = JOB_PIPELINE_ORDER.indexOf(b.jobName)
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
  })

  const panelJob = jobs.find(j => j.jobName === selectedJob)

  const handleRun = (jobName: string) => {
    runJob.mutate(jobName, {
      onSuccess: () => toast('success', `${JOB_DISPLAY_NAMES[jobName as keyof typeof JOB_DISPLAY_NAMES] || jobName} triggered`),
      onError: () => toast('error', 'Failed to trigger job'),
    })
  }

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Job</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500 hidden lg:table-cell">Cron</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Enabled</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500 hidden lg:table-cell">Last Started</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500 hidden lg:table-cell">Last Completed</th>
              <th scope="col" className="text-left px-3 py-2 font-medium text-neutral-500 hidden lg:table-cell">Error</th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map(job => (
              <tr
                key={job.jobName}
                className={`border-b border-neutral-100 last:border-0 ${job.running ? 'bg-yellow-50' : 'hover:bg-neutral-50'}`}
              >
                <td className="px-3 py-2 font-medium text-neutral-900">
                  <button
                    onClick={() => setSelectedJob(job.jobName)}
                    className="text-left hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {JOB_DISPLAY_NAMES[job.jobName] || job.jobName}
                  </button>
                </td>
                <td className="px-3 py-2 hidden lg:table-cell">
                  <CronEditor job={job} />
                </td>
                <td className="px-3 py-2">
                  <EnabledToggle job={job} />
                </td>
                <td className="px-3 py-2"><JobStatusBadge job={job} /></td>
                <td className="px-3 py-2 text-neutral-500 whitespace-nowrap hidden lg:table-cell"><TimeWithRelative dateStr={job.lastStartedAt} /></td>
                <td className="px-3 py-2 text-neutral-500 whitespace-nowrap hidden lg:table-cell"><TimeWithRelative dateStr={job.lastCompletedAt} /></td>
                <td className="px-3 py-2 max-w-[200px] hidden lg:table-cell">
                  {job.lastError ? (
                    <span className="text-red-600 text-xs">{job.lastError.slice(0, 60)}...</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {/* Desktop actions */}
                  <div className="hidden lg:flex items-center justify-end gap-0.5">
                    {job.running ? (
                      <span className="inline-block p-1"><RunningSpinner /></span>
                    ) : (
                      <ActionIconButton
                        icon={PlayIcon}
                        label={`Run ${JOB_DISPLAY_NAMES[job.jobName] || job.jobName}`}
                        onClick={() => handleRun(job.jobName)}
                        disabled={runJob.isPending && runJob.variables === job.jobName}
                      />
                    )}
                    <ActionIconButton
                      icon={PencilSquareIcon}
                      label="Edit"
                      onClick={() => setSelectedJob(job.jobName)}
                    />
                  </div>

                  {/* Mobile overflow menu */}
                  <div className="lg:hidden flex justify-end">
                    <Menu as="div" className="relative">
                      <MenuButton className="rounded p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                        <EllipsisVerticalIcon className="h-5 w-5 text-neutral-400" />
                      </MenuButton>
                      <MenuItems className="absolute right-0 z-10 mt-1 w-40 rounded-md bg-white shadow-lg border border-neutral-200 py-1 focus:outline-none">
                        <MenuItem>
                          {job.running ? (
                            <div className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-yellow-700">
                              <RunningSpinner size="h-4 w-4" />
                              Running...
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRun(job.jobName)}
                              disabled={runJob.isPending && runJob.variables === job.jobName}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100 disabled:opacity-50"
                            >
                              <PlayIcon className="h-4 w-4 shrink-0" />
                              Run
                            </button>
                          )}
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => setSelectedJob(job.jobName)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 data-[focus]:bg-neutral-100"
                          >
                            <PencilSquareIcon className="h-4 w-4 shrink-0" />
                            Edit
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {panelJob && (
        <JobEditPanel job={panelJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  )
}

function EnabledToggle({ job }: { job: JobRun }) {
  const updateJob = useUpdateJob()
  const { toast } = useToast()

  const handleToggle = () => {
    updateJob.mutate(
      { jobName: job.jobName, data: { enabled: !job.enabled } },
      {
        onSuccess: () => toast('success', `${JOB_DISPLAY_NAMES[job.jobName]} ${!job.enabled ? 'enabled' : 'disabled'}`),
        onError: () => toast('error', 'Failed to update job'),
      },
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        job.enabled ? 'bg-brand-600' : 'bg-neutral-300'
      }`}
      role="switch"
      aria-checked={job.enabled}
      aria-label={`${job.enabled ? 'Disable' : 'Enable'} ${JOB_DISPLAY_NAMES[job.jobName]}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${job.enabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
    </button>
  )
}
