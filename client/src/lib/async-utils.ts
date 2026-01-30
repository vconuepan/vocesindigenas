/**
 * Concurrency-limited parallel map. Runs `fn` on each item with at most
 * `concurrency` promises in flight at once.
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ results: R[]; errors: Array<{ item: T; error: unknown }> }> {
  const results: R[] = []
  const errors: Array<{ item: T; error: unknown }> = []
  let completed = 0
  let nextIndex = 0

  async function runNext(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      const item = items[index]
      try {
        const result = await fn(item)
        results.push(result)
      } catch (error) {
        errors.push({ item, error })
      }
      completed++
      onProgress?.(completed, items.length)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext(),
  )
  await Promise.all(workers)

  return { results, errors }
}
