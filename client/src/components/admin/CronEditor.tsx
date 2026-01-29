import { useState } from 'react'
import type { JobRun } from '@shared/types'
import { Button } from '../ui/Button'
import { useUpdateJob } from '../../hooks/useJobs'
import { useToast } from '../ui/Toast'

interface CronEditorProps {
  job: JobRun
}

export function CronEditor({ job }: CronEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(job.cronExpression)
  const updateJob = useUpdateJob()
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      await updateJob.mutateAsync({ jobName: job.jobName, data: { cronExpression: value } })
      toast('success', 'Cron expression updated')
      setEditing(false)
    } catch {
      toast('error', 'Invalid cron expression')
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-32 rounded border border-neutral-300 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setEditing(false); setValue(job.cronExpression) }
          }}
          autoFocus
        />
        <Button variant="ghost" size="sm" onClick={handleSave} loading={updateJob.isPending}>Save</Button>
        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setValue(job.cronExpression) }}>Cancel</Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="font-mono text-xs text-neutral-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
      title="Click to edit"
    >
      {job.cronExpression}
    </button>
  )
}
