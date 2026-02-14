import { describe, it, expect } from 'vitest'
import { summarizeError } from './errors.js'

describe('summarizeError', () => {
  it('returns HTTP status for axios errors with response', () => {
    const err = new Error('Request failed') as any
    err.isAxiosError = true
    err.response = { status: 404 }
    expect(summarizeError(err)).toBe('HTTP 404')
  })

  it('returns error code when no response status', () => {
    const err = new Error('timeout') as any
    err.isAxiosError = true
    err.code = 'ECONNABORTED'
    expect(summarizeError(err)).toBe('ECONNABORTED')
  })

  it('returns message for axios errors without status or code', () => {
    const err = new Error('Network Error') as any
    err.isAxiosError = true
    expect(summarizeError(err)).toBe('Network Error')
  })

  it('returns message for regular errors', () => {
    expect(summarizeError(new Error('something broke'))).toBe('something broke')
  })

  it('converts non-error values to string', () => {
    expect(summarizeError('string error')).toBe('string error')
    expect(summarizeError(42)).toBe('42')
    expect(summarizeError(null)).toBe('null')
  })
})
