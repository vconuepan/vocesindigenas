import { describe, it, expect } from 'vitest'
import { parallelMap } from './async-utils'

describe('parallelMap', () => {
  it('processes all items and returns results', async () => {
    const items = [1, 2, 3, 4, 5]
    const fn = async (n: number) => n * 2

    const { results, errors } = await parallelMap(items, fn, 3)

    expect(results).toEqual([2, 4, 6, 8, 10])
    expect(errors).toEqual([])
  })

  it('respects concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = [1, 2, 3, 4, 5, 6]

    const fn = async (n: number) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(r => setTimeout(r, 10))
      inFlight--
      return n
    }

    await parallelMap(items, fn, 2)

    expect(maxInFlight).toBe(2)
  })

  it('reports progress after each item completes', async () => {
    const items = ['a', 'b', 'c']
    const progressCalls: Array<[number, number]> = []

    await parallelMap(
      items,
      async (s) => s.toUpperCase(),
      1,
      (completed, total) => progressCalls.push([completed, total]),
    )

    expect(progressCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('handles mixed success and failure', async () => {
    const items = [1, 2, 3, 4]
    const fn = async (n: number) => {
      if (n % 2 === 0) throw new Error(`fail ${n}`)
      return n * 10
    }

    const { results, errors } = await parallelMap(items, fn, 4)

    expect(results).toEqual([10, 30])
    expect(errors).toHaveLength(2)
    expect(errors[0].item).toBe(2)
    expect(errors[1].item).toBe(4)
  })

  it('returns empty results for empty input', async () => {
    const { results, errors } = await parallelMap(
      [],
      async (n: number) => n,
      5,
    )

    expect(results).toEqual([])
    expect(errors).toEqual([])
  })

  it('works when concurrency exceeds item count', async () => {
    const items = [1, 2]
    const fn = async (n: number) => n + 1

    const { results, errors } = await parallelMap(items, fn, 100)

    expect(results).toEqual([2, 3])
    expect(errors).toEqual([])
  })

  it('reports progress for both successes and failures', async () => {
    const items = [1, 2, 3]
    const progressCalls: Array<[number, number]> = []

    await parallelMap(
      items,
      async (n) => {
        if (n === 2) throw new Error('fail')
        return n
      },
      1,
      (completed, total) => progressCalls.push([completed, total]),
    )

    expect(progressCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })
})
