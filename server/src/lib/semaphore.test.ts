import { describe, it, expect } from 'vitest'
import { Semaphore } from './semaphore.js'

describe('Semaphore', () => {
  it('throws if maxConcurrency < 1', () => {
    expect(() => new Semaphore(0)).toThrow('maxConcurrency must be a finite integer >= 1')
  })

  it('throws if maxConcurrency is NaN or Infinity', () => {
    expect(() => new Semaphore(NaN)).toThrow('maxConcurrency must be a finite integer >= 1')
    expect(() => new Semaphore(Infinity)).toThrow('maxConcurrency must be a finite integer >= 1')
  })

  it('allows up to maxConcurrency tasks to run simultaneously', async () => {
    const semaphore = new Semaphore(2)
    let running = 0
    let maxRunning = 0

    const task = () =>
      semaphore.run(async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise(resolve => setTimeout(resolve, 50))
        running--
      })

    await Promise.all([task(), task(), task(), task(), task()])

    expect(maxRunning).toBe(2)
    expect(running).toBe(0)
  })

  it('run() returns the value from the function', async () => {
    const semaphore = new Semaphore(1)
    const result = await semaphore.run(async () => 42)
    expect(result).toBe(42)
  })

  it('run() releases on error', async () => {
    const semaphore = new Semaphore(1)

    await expect(
      semaphore.run(async () => {
        throw new Error('fail')
      }),
    ).rejects.toThrow('fail')

    // Should still be able to acquire after error
    const result = await semaphore.run(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('processes tasks in FIFO order when queued', async () => {
    const semaphore = new Semaphore(1)
    const order: number[] = []

    const tasks = [0, 1, 2, 3].map(i =>
      semaphore.run(async () => {
        order.push(i)
        await new Promise(resolve => setTimeout(resolve, 10))
      }),
    )

    await Promise.all(tasks)
    expect(order).toEqual([0, 1, 2, 3])
  })

  it('works with concurrency of 1 (sequential)', async () => {
    const semaphore = new Semaphore(1)
    let running = 0
    let maxRunning = 0

    const tasks = Array.from({ length: 5 }, () =>
      semaphore.run(async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise(resolve => setTimeout(resolve, 10))
        running--
      }),
    )

    await Promise.all(tasks)
    expect(maxRunning).toBe(1)
  })
})
