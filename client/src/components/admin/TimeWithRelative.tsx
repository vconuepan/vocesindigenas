import { formatDateWithTime, formatRelativeTime } from '../../lib/constants'
import { useServerTimezone } from '../../hooks/useJobs'

interface TimeWithRelativeProps {
  dateStr: string | null
}

export function TimeWithRelative({ dateStr }: TimeWithRelativeProps) {
  const timeZone = useServerTimezone()

  if (!dateStr) return <span>—</span>

  return (
    <span>
      {formatDateWithTime(dateStr, timeZone)}
      <span className="block text-xs text-neutral-400">{formatRelativeTime(dateStr, timeZone)}</span>
    </span>
  )
}
