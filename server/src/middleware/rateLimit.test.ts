import { describe, it, expect } from 'vitest'
import { apiLimiter, expensiveOpLimiter, authLimiter, refreshLimiter } from './rateLimit.js'

describe('Rate Limiters', () => {
  it('exports apiLimiter', () => {
    expect(apiLimiter).toBeDefined()
    expect(typeof apiLimiter).toBe('function')
  })

  it('exports expensiveOpLimiter', () => {
    expect(expensiveOpLimiter).toBeDefined()
    expect(typeof expensiveOpLimiter).toBe('function')
  })

  it('exports authLimiter', () => {
    expect(authLimiter).toBeDefined()
    expect(typeof authLimiter).toBe('function')
  })

  it('exports refreshLimiter', () => {
    expect(refreshLimiter).toBeDefined()
    expect(typeof refreshLimiter).toBe('function')
  })
})
