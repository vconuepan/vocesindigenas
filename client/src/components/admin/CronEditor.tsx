import { useState } from 'react'
import type { JobRun } from '@shared/types'
import { Button } from '../ui/Button'
import { useUpdateJob } from '../../hooks/useJobs'
import { useToast } from '../ui/Toast'
import { cronToHuman, CRON_PRESETS, findPreset } from '../../lib/cron'

interface CronEditorProps {
  job: JobRun
  initialEditing?: boolean
  onSave?: () => void
  onCancel?: () => void
}

export function CronEditor({ job, initialEditing = false, onSave, onCancel }: CronEditorProps) {
  const [editing, setEditing] = useState(initialEditing)
  const [mode, setMode] = useState<'preset' | 'custom'>(() =>
    findPreset(job.cronExpression) ? 'preset' : 'custom',
  )
  const [selectedPreset, setSelectedPreset] = useState(
    () => findPreset(job.cronExpression)?.value ?? '',
  )
  const [customValue, setCustomValue] = useState(job.cronExpression)
  const updateJob = useUpdateJob()
  const { toast } = useToast()

  const currentValue = mode === 'preset' ? selectedPreset : customValue

  const handleSave = async () => {
    if (!currentValue.trim()) {
      toast('error', 'Please select or enter a schedule')
      return
    }
    try {
      await updateJob.mutateAsync({ jobName: job.jobName, data: { cronExpression: currentValue } })
      toast('success', 'Schedule updated')
      setEditing(false)
      onSave?.()
    } catch {
      toast('error', 'Invalid cron expression')
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setMode(findPreset(job.cronExpression) ? 'preset' : 'custom')
    setSelectedPreset(findPreset(job.cronExpression)?.value ?? '')
    setCustomValue(job.cronExpression)
    onCancel?.()
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left text-xs text-neutral-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
        title="Click to edit schedule"
      >
        <span className="block">{cronToHuman(job.cronExpression)}</span>
        <span className="block font-mono text-neutral-400 text-[10px]">{job.cronExpression}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-neutral-600 cursor-pointer">
          <input
            type="radio"
            name={`cron-mode-${job.jobName}`}
            checked={mode === 'preset'}
            onChange={() => setMode('preset')}
            className="accent-brand-600"
          />
          Preset
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-600 cursor-pointer">
          <input
            type="radio"
            name={`cron-mode-${job.jobName}`}
            checked={mode === 'custom'}
            onChange={() => { setMode('custom'); if (selectedPreset) setCustomValue(selectedPreset) }}
            className="accent-brand-600"
          />
          Custom
        </label>
      </div>

      {mode === 'preset' ? (
        <select
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          autoFocus
        >
          <option value="">Select a schedule...</option>
          {CRON_PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      ) : (
        <div>
          <input
            type="text"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="0 */6 * * *"
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-neutral-400">
            min hour day month weekday
          </p>
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleSave} loading={updateJob.isPending}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
