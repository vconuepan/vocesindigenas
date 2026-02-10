/**
 * Cron expression helpers for the admin UI.
 * Converts between cron expressions and human-readable descriptions,
 * and provides preset schedules for the cron editor.
 */

export interface CronPreset {
  label: string
  value: string
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6:00 AM', value: '0 6 * * *' },
  { label: 'Daily at 9:00 AM', value: '0 9 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Daily at 6:00 PM', value: '0 18 * * *' },
  { label: 'Weekdays at 9:00 AM', value: '0 9 * * 1-5' },
  { label: 'Mon/Wed/Fri at 9:00 AM', value: '0 9 * * 1,3,5' },
  { label: 'Tue/Thu at 9:00 AM', value: '0 9 * * 2,4' },
]

const DAY_NAMES: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
  '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
}

function formatTime(hour: number, minute: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const mm = pad(minute)
  if (hour === 0) return `12:${mm} AM`
  if (hour === 12) return `12:${mm} PM`
  if (hour < 12) return `${hour}:${mm} AM`
  return `${hour - 12}:${mm} PM`
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function formatTimes(hours: number[], minute: number): string {
  return hours.map(h => formatTime(h, minute)).join(', ')
}

function parseDays(dayField: string): string | null {
  if (dayField === '*') return null // every day
  if (dayField === '1-5') return 'weekdays'
  if (dayField === '0,6' || dayField === '6,0') return 'weekends'

  const days = dayField.split(',')
  if (days.every(d => DAY_NAMES[d])) {
    return days.map(d => DAY_NAMES[d]).join(', ')
  }
  return dayField
}

/**
 * Format a hour range like "9-17" into "9 AM \u2013 5 PM".
 */
function formatHourRange(rangeStr: string): string | null {
  const match = rangeStr.match(/^(\d+)-(\d+)$/)
  if (!match) return null
  return `${formatHourLabel(parseInt(match[1], 10))} \u2013 ${formatHourLabel(parseInt(match[2], 10))}`
}

/**
 * Convert a cron expression to a human-readable string.
 * Handles common patterns; falls back to the raw expression for unusual ones.
 */
export function cronToHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Only handle standard cases (no month/day-of-month specifics)
  if (dayOfMonth !== '*' || month !== '*') return expr

  const dayStr = parseDays(dayOfWeek)
  const min = /^\d+$/.test(minute) ? parseInt(minute, 10) : NaN
  const everyNMin = minute.match(/^\*\/(\d+)$/)
  const everyNHours = hour.match(/^\*\/(\d+)$/)
  const hourRange = hour.match(/^(\d+)-(\d+)$/)

  // Every N minutes: "*/N * * * *" or "*/N 9-17 * * *"
  if (everyNMin) {
    const n = parseInt(everyNMin[1], 10)
    const minLabel = `${n} minute${n > 1 ? 's' : ''}`

    if (hourRange) {
      const range = formatHourRange(hour)
      return dayStr
        ? `${dayStr}, every ${minLabel}, ${range}`
        : `Every ${minLabel}, ${range}`
    }

    if (hour === '*') {
      return dayStr ? `${dayStr}, every ${minLabel}` : `Every ${minLabel}`
    }

    return expr
  }

  // Every N hours with non-zero minutes: "MM */N * * *"
  if (everyNHours && !isNaN(min)) {
    const n = parseInt(everyNHours[1], 10)
    const hourLabel = `${n} hour${n > 1 ? 's' : ''}`
    if (min === 0) {
      const prefix = dayStr ? `${dayStr}, every` : 'Every'
      return `${prefix} ${hourLabel}`
    }
    const prefix = dayStr ? `${dayStr}, every` : 'Every'
    return `${prefix} ${hourLabel} at :${min.toString().padStart(2, '0')}`
  }

  // Every hour with hour range: "0 9-17 * * *"
  if (minute === '0' && hourRange) {
    const range = formatHourRange(hour)
    return dayStr ? `${dayStr}, every hour, ${range}` : `Every hour, ${range}`
  }

  // Every hour: "0 * * * *"
  if (minute === '0' && hour === '*') {
    return dayStr ? `${dayStr}, every hour` : 'Every hour'
  }

  // Specific hours with any minute: "MM 9 * * *" or "MM 9,21 * * *"
  if (!isNaN(min) && /^[\d,]+$/.test(hour)) {
    const hours = hour.split(',').map(Number)
    const timeStr = formatTimes(hours, min)
    if (dayStr) return `${dayStr} at ${timeStr}`
    return `Daily at ${timeStr}`
  }

  return expr
}

/**
 * Check if a cron expression matches one of the presets.
 */
export function findPreset(expr: string): CronPreset | undefined {
  return CRON_PRESETS.find(p => p.value === expr.trim())
}
