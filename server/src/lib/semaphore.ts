export class Semaphore {
  private queue: (() => void)[] = []
  private active = 0

  constructor(private readonly maxConcurrency: number) {
    if (!Number.isFinite(maxConcurrency) || maxConcurrency < 1) {
      throw new Error('Semaphore maxConcurrency must be a finite integer >= 1')
    }
  }

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++
      return
    }
    return new Promise<void>(resolve => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) {
      this.active++
      next()
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}
