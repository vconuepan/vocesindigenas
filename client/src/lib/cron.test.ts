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

  it('converts every N minutes patterns', () => {
    expect(cronToHuman('*/5 * * * *')).toBe('Every 5 minutes')
    expect(cronToHuman('*/15 * * * *')).toBe('Every 15 minutes')
    expect(cronToHuman('*/30 * * * *')).toBe('Every 30 minutes')
  })

  it('converts non-zero minutes with specific hours', () => {
    expect(cronToHuman('30 9 * * *')).toBe('Daily at 9:30 AM')
    expect(cronToHuman('15 18 * * *')).toBe('Daily at 6:15 PM')
    expect(cronToHuman('45 0 * * *')).toBe('Daily at 12:45 AM')
    expect(cronToHuman('30 12 * * *')).toBe('Daily at 12:30 PM')
  })

  it('converts non-zero minutes with multiple hours', () => {
    expect(cronToHuman('30 9,21 * * *')).toBe('Daily at 9:30 AM, 9:30 PM')
    expect(cronToHuman('15 6,18 * * *')).toBe('Daily at 6:15 AM, 6:15 PM')
  })

  it('converts non-zero minutes with day patterns', () => {
    expect(cronToHuman('30 9 * * 1-5')).toBe('weekdays at 9:30 AM')
    expect(cronToHuman('15 9 * * 1,3,5')).toBe('Mon, Wed, Fri at 9:15 AM')
  })

  it('converts non-zero minutes with every N hours', () => {
    expect(cronToHuman('15 */6 * * *')).toBe('Every 6 hours at :15')
    expect(cronToHuman('30 */4 * * *')).toBe('Every 4 hours at :30')
  })

  it('converts hour range patterns', () => {
    expect(cronToHuman('0 9-17 * * *')).toBe('Every hour, 9 AM \u2013 5 PM')
    expect(cronToHuman('0 8-20 * * *')).toBe('Every hour, 8 AM \u2013 8 PM')
    expect(cronToHuman('0 22-6 * * *')).toBe('Every hour, 10 PM \u2013 6 AM')
  })

  it('converts every N minutes with restricted hours', () => {
    expect(cronToHuman('*/15 9-17 * * *')).toBe('Every 15 minutes, 9 AM \u2013 5 PM')
    expect(cronToHuman('*/5 8-20 * * *')).toBe('Every 5 minutes, 8 AM \u2013 8 PM')
  })

  it('converts every N minutes with day patterns', () => {
    expect(cronToHuman('*/10 * * * 1-5')).toBe('weekdays, every 10 minutes')
  })

  it('returns raw expression for unrecognized patterns', () => {
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
