import { describe, it, expect } from 'vitest'
import { getTitleLabel, getHeadline } from './title-label'

describe('getTitleLabel', () => {
  it('returns explicit titleLabel when set', () => {
    expect(getTitleLabel({ titleLabel: 'EU AI Act', title: 'Some headline', sourceTitle: 'Original' }))
      .toBe('EU AI Act')
  })

  it('extracts label from colon-prefixed legacy title', () => {
    expect(getTitleLabel({ titleLabel: null, title: 'Climate risk: Sea levels rising faster', sourceTitle: 'Original' }))
      .toBe('Climate risk')
  })

  it('returns null when no colon in title', () => {
    expect(getTitleLabel({ titleLabel: null, title: 'Sea levels rising faster than expected', sourceTitle: 'Original' }))
      .toBeNull()
  })

  it('returns null when colon prefix is longer than 40 chars', () => {
    const longPrefix = 'A'.repeat(41)
    expect(getTitleLabel({ titleLabel: null, title: `${longPrefix}: rest`, sourceTitle: 'Original' }))
      .toBeNull()
  })

  it('returns null when title is null', () => {
    expect(getTitleLabel({ titleLabel: null, title: null, sourceTitle: 'Original' }))
      .toBeNull()
  })
})

describe('getHeadline', () => {
  it('returns full title when titleLabel is set', () => {
    expect(getHeadline({ titleLabel: 'EU AI Act', title: 'Whistleblower channel could shape enforcement', sourceTitle: 'Original' }))
      .toBe('Whistleblower channel could shape enforcement')
  })

  it('strips colon prefix for legacy stories without titleLabel', () => {
    expect(getHeadline({ titleLabel: null, title: 'Climate risk: Sea levels rising faster', sourceTitle: 'Original' }))
      .toBe('Sea levels rising faster')
  })

  it('falls back to sourceTitle when title is null', () => {
    expect(getHeadline({ titleLabel: null, title: null, sourceTitle: 'Original Article Title' }))
      .toBe('Original Article Title')
  })

  it('returns full title when colon prefix is too long', () => {
    const longPrefix = 'A'.repeat(41)
    const title = `${longPrefix}: rest of headline`
    expect(getHeadline({ titleLabel: null, title, sourceTitle: 'Original' }))
      .toBe(title)
  })
})
