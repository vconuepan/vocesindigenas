import { describe, it, expect } from 'vitest'
import { cronToHuman, findPreset } from './cron'

describe('cronToHuman', () => {
  it('converts every N hours patterns', () => {
    expect(cronToHuman('0 */2 * * *')).toBe('Every 2 hours')
    expect(cronToHuman('0 */4 * * *')).toBe('Every 4 hours')
    expect(cronToHuman('0 */6 * * *')).toBe('Every 6 hours')
    expect(cronToHuman('0 */12 * * *')).toBe('Every 12 hours')
  })

  it('converts every hour', () => {
    expect(cronToHuman('0 * * * *')).toBe('Every hour')
  })

  it('converts daily at specific hour', () => {
    expect(cronToHuman('0 0 * * *')).toBe('Daily at 12:00 AM')
    expect(cronToHuman('0 6 * * *')).toBe('Daily at 6:00 AM')
    expect(cronToHuman('0 9 * * *')).toBe('Daily at 9:00 AM')
    expect(cronToHuman('0 12 * * *')).toBe('Daily at 12:00 PM')
    expect(cronToHuman('0 18 * * *')).toBe('Daily at 6:00 PM')
  })

  it('converts multiple specific hours', () => {
    expect(cronToHuman('0 9,21 * * *')).toBe('Daily at 9:00 AM, 9:00 PM')
    expect(cronToHuman('0 1,7,13,19 * * *')).toBe('Daily at 1:00 AM, 7:00 AM, 1:00 PM, 7:00 PM')
  })

  it('converts weekday patterns', () => {
    expect(cronToHuman('0 9 * * 1-5')).toBe('weekdays at 9:00 AM')
    expect(cronToHuman('0 9 * * 1,3,5')).toBe('Mon, Wed, Fri at 9:00 AM')
    expect(cronToHuman('0 9 * * 2,4')).toBe('Tue, Thu at 9:00 AM')
  })

  it('converts day patterns with every N hours', () => {
    expect(cronToHuman('0 */6 * * 1-5')).toBe('weekdays, every 6 hours')
    expect(cronToHuman('0 */4 * * 1,3,5')).toBe('Mon, Wed, Fri, every 4 hours')
  })

  it('returns raw expression for unrecognized patterns', () => {
    expect(cronToHuman('*/5 * * * *')).toBe('*/5 * * * *')
    expect(cronToHuman('0 9 15 * *')).toBe('0 9 15 * *') // specific day of month
    expect(cronToHuman('0 9 * 3 *')).toBe('0 9 * 3 *')   // specific month
    expect(cronToHuman('invalid')).toBe('invalid')
  })
})

describe('findPreset', () => {
  it('finds matching presets', () => {
    expect(findPreset('0 */6 * * *')?.label).toBe('Every 6 hours')
    expect(findPreset('0 9 * * 1-5')?.label).toBe('Weekdays at 9:00 AM')
    expect(findPreset('0 9 * * 1,3,5')?.label).toBe('Mon/Wed/Fri at 9:00 AM')
  })

  it('returns undefined for non-preset expressions', () => {
    expect(findPreset('0 9,21 * * *')).toBeUndefined()
    expect(findPreset('*/5 * * * *')).toBeUndefined()
  })
})
