import { describe, it, expect, vi } from 'vitest'
import { paginate } from './paginate.js'

describe('paginate', () => {
  it('returns correct pagination structure', async () => {
    const mockData = [{ id: '1' }, { id: '2' }]
    const result = await paginate({
      findMany: () => Promise.resolve(mockData),
      count: () => Promise.resolve(10),
      page: 1,
      pageSize: 2,
    })

    expect(result).toEqual({
      data: mockData,
      total: 10,
      page: 1,
      pageSize: 2,
      totalPages: 5,
    })
  })

  it('calculates totalPages with Math.ceil', async () => {
    const result = await paginate({
      findMany: () => Promise.resolve([{ id: '1' }]),
      count: () => Promise.resolve(7),
      page: 2,
      pageSize: 3,
    })

    expect(result.totalPages).toBe(3) // ceil(7/3) = 3
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(3)
  })

  it('passes page and pageSize through unchanged', async () => {
    const result = await paginate({
      findMany: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      page: 5,
      pageSize: 50,
    })

    expect(result.page).toBe(5)
    expect(result.pageSize).toBe(50)
  })

  it('calls findMany and count concurrently', async () => {
    const callOrder: string[] = []

    const findMany = () =>
      new Promise<string[]>((resolve) => {
        callOrder.push('findMany-start')
        setTimeout(() => {
          callOrder.push('findMany-end')
          resolve(['a', 'b'])
        }, 10)
      })

    const count = () =>
      new Promise<number>((resolve) => {
        callOrder.push('count-start')
        setTimeout(() => {
          callOrder.push('count-end')
          resolve(2)
        }, 10)
      })

    await paginate({ findMany, count, page: 1, pageSize: 10 })

    // Both should start before either ends (concurrent via Promise.all)
    expect(callOrder[0]).toBe('findMany-start')
    expect(callOrder[1]).toBe('count-start')
  })

  it('handles empty results (total=0)', async () => {
    const result = await paginate({
      findMany: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      page: 1,
      pageSize: 25,
    })

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    })
  })

  it('handles single page of results', async () => {
    const result = await paginate({
      findMany: () => Promise.resolve([{ id: '1' }]),
      count: () => Promise.resolve(1),
      page: 1,
      pageSize: 25,
    })

    expect(result.totalPages).toBe(1)
  })

  it('propagates findMany errors', async () => {
    await expect(
      paginate({
        findMany: () => Promise.reject(new Error('DB error')),
        count: () => Promise.resolve(0),
        page: 1,
        pageSize: 25,
      }),
    ).rejects.toThrow('DB error')
  })

  it('propagates count errors', async () => {
    await expect(
      paginate({
        findMany: () => Promise.resolve([]),
        count: () => Promise.reject(new Error('Count failed')),
        page: 1,
        pageSize: 25,
      }),
    ).rejects.toThrow('Count failed')
  })
})
