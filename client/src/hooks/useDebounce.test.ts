import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('debounces value updates', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    )

    // Update the value
    rerender({ value: 'ab' })
    expect(result.current).toBe('a') // Still old value

    // Advance time partially
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('a') // Still old value

    // Advance past the delay
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe('ab') // Now updated

    vi.useRealTimers()
  })

  it('resets timer on rapid updates', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'ab' })
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ value: 'abc' })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe('a') // Still waiting

    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('abc') // Latest value after full delay

    vi.useRealTimers()
  })
})
