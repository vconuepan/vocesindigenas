import { describe, it, expect } from 'vitest'
import { splitIntoGroups } from './utils.js'

describe('splitIntoGroups', () => {
  it('returns single group when items fit within maxSize', () => {
    const items = [1, 2, 3]
    const result = splitIntoGroups(items, 5)
    expect(result).toEqual([[1, 2, 3]])
  })

  it('returns single group when items exactly equal maxSize', () => {
    const items = [1, 2, 3]
    const result = splitIntoGroups(items, 3)
    expect(result).toEqual([[1, 2, 3]])
  })

  it('splits into two groups when items exceed maxSize', () => {
    const items = [1, 2, 3, 4, 5]
    const result = splitIntoGroups(items, 3)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([1, 2, 3])
    expect(result[1]).toEqual([4, 5])
  })

  it('distributes remainder across first groups', () => {
    // 7 items, maxSize 3 → 3 groups (3, 2, 2)
    const items = [1, 2, 3, 4, 5, 6, 7]
    const result = splitIntoGroups(items, 3)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual([1, 2, 3])
    expect(result[1]).toEqual([4, 5])
    expect(result[2]).toEqual([6, 7])
  })

  it('preserves all items across groups', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const result = splitIntoGroups(items, 7)
    const flat = result.flat()
    expect(flat).toEqual(items)
  })

  it('no group exceeds maxSize', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const result = splitIntoGroups(items, 7)
    for (const group of result) {
      expect(group.length).toBeLessThanOrEqual(7)
    }
  })

  it('groups differ by at most 1 in size', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    const result = splitIntoGroups(items, 5)
    const sizes = result.map(g => g.length)
    const min = Math.min(...sizes)
    const max = Math.max(...sizes)
    expect(max - min).toBeLessThanOrEqual(1)
  })

  it('handles single item', () => {
    expect(splitIntoGroups(['a'], 10)).toEqual([['a']])
  })

  it('handles empty array', () => {
    expect(splitIntoGroups([], 5)).toEqual([])
  })

  it('works with maxSize of 1', () => {
    const items = ['a', 'b', 'c']
    const result = splitIntoGroups(items, 1)
    expect(result).toEqual([['a'], ['b'], ['c']])
  })
})
