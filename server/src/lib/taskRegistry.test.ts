import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We can't use the singleton, so we import the class indirectly by
// re-creating a registry per test. But the module exports a singleton.
// Instead we'll test via the singleton and clear it between tests.

// Mock logger to avoid output
vi.mock('./logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const { taskRegistry } = await import('./taskRegistry.js')

describe('TaskRegistry', () => {
  beforeEach(() => {
    // Clean up any leftover tasks without killing the cleanup timer
    taskRegistry.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('create', () => {
    it('creates a task and returns an ID', () => {
      const taskId = taskRegistry.create('assess', 5, ['s1', 's2', 's3', 's4', 's5'])
      expect(taskId).toBeTruthy()
      expect(typeof taskId).toBe('string')
    })

    it('initializes task with correct state', () => {
      const storyIds = ['s1', 's2']
      const taskId = taskRegistry.create('preassess', 2, storyIds)
      const task = taskRegistry.get(taskId)

      expect(task).toBeDefined()
      expect(task!.type).toBe('preassess')
      expect(task!.status).toBe('running')
      expect(task!.total).toBe(2)
      expect(task!.completed).toBe(0)
      expect(task!.failed).toBe(0)
      expect(task!.errors).toEqual([])
      expect(task!.storyIds).toEqual(storyIds)
      expect(task!.createdAt).toBeTruthy()
      expect(task!.completedAt).toBeUndefined()
    })
  })

  describe('get', () => {
    it('returns undefined for unknown task ID', () => {
      expect(taskRegistry.get('nonexistent')).toBeUndefined()
    })

    it('returns serialized task state with ISO dates', () => {
      const taskId = taskRegistry.create('assess', 1, ['s1'])
      const task = taskRegistry.get(taskId)!

      // createdAt should be an ISO string
      expect(task.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('increment', () => {
    it('increments completed count', () => {
      const taskId = taskRegistry.create('assess', 3, ['s1', 's2', 's3'])

      taskRegistry.increment(taskId, 'completed')
      taskRegistry.increment(taskId, 'completed')

      expect(taskRegistry.get(taskId)!.completed).toBe(2)
      expect(taskRegistry.get(taskId)!.failed).toBe(0)
    })

    it('increments failed count with error message', () => {
      const taskId = taskRegistry.create('assess', 2, ['s1', 's2'])

      taskRegistry.increment(taskId, 'failed', 'LLM timeout')

      expect(taskRegistry.get(taskId)!.failed).toBe(1)
      expect(taskRegistry.get(taskId)!.errors).toEqual(['LLM timeout'])
    })

    it('caps error messages at 20', () => {
      const taskId = taskRegistry.create('assess', 30, Array.from({ length: 30 }, (_, i) => `s${i}`))

      for (let i = 0; i < 25; i++) {
        taskRegistry.increment(taskId, 'failed', `error ${i}`)
      }

      expect(taskRegistry.get(taskId)!.errors).toHaveLength(20)
    })

    it('does nothing for unknown task ID', () => {
      // Should not throw
      taskRegistry.increment('nonexistent', 'completed')
    })
  })

  describe('complete', () => {
    it('sets status to completed when some succeeded', () => {
      const taskId = taskRegistry.create('assess', 3, ['s1', 's2', 's3'])
      taskRegistry.increment(taskId, 'completed')
      taskRegistry.increment(taskId, 'completed')
      taskRegistry.increment(taskId, 'failed', 'err')

      taskRegistry.complete(taskId)

      const task = taskRegistry.get(taskId)!
      expect(task.status).toBe('completed')
      expect(task.completedAt).toBeTruthy()
    })

    it('sets status to failed when all failed', () => {
      const taskId = taskRegistry.create('assess', 2, ['s1', 's2'])
      taskRegistry.increment(taskId, 'failed', 'err1')
      taskRegistry.increment(taskId, 'failed', 'err2')

      taskRegistry.complete(taskId)

      expect(taskRegistry.get(taskId)!.status).toBe('failed')
    })

    it('sets status to completed when none failed', () => {
      const taskId = taskRegistry.create('select', 1, ['s1'])
      taskRegistry.increment(taskId, 'completed')

      taskRegistry.complete(taskId)

      expect(taskRegistry.get(taskId)!.status).toBe('completed')
    })

    it('does nothing for unknown task ID', () => {
      taskRegistry.complete('nonexistent')
    })
  })

  describe('getProcessingStoryIds', () => {
    it('returns empty array when no tasks', () => {
      expect(taskRegistry.getProcessingStoryIds()).toEqual([])
    })

    it('returns story IDs from running tasks', () => {
      taskRegistry.create('assess', 2, ['s1', 's2'])
      taskRegistry.create('preassess', 1, ['s3'])

      const ids = taskRegistry.getProcessingStoryIds()
      expect(ids.sort()).toEqual(['s1', 's2', 's3'])
    })

    it('excludes story IDs from completed tasks', () => {
      const taskId = taskRegistry.create('assess', 1, ['s1'])
      taskRegistry.create('preassess', 1, ['s2'])
      taskRegistry.increment(taskId, 'completed')
      taskRegistry.complete(taskId)

      const ids = taskRegistry.getProcessingStoryIds()
      expect(ids).toEqual(['s2'])
    })

    it('deduplicates IDs across tasks', () => {
      taskRegistry.create('assess', 1, ['s1', 's2'])
      taskRegistry.create('preassess', 1, ['s2', 's3'])

      const ids = taskRegistry.getProcessingStoryIds()
      expect(ids.sort()).toEqual(['s1', 's2', 's3'])
    })
  })

  describe('destroy', () => {
    it('clears all tasks', () => {
      taskRegistry.create('assess', 1, ['s1'])
      taskRegistry.create('preassess', 1, ['s2'])

      taskRegistry.destroy()

      expect(taskRegistry.getProcessingStoryIds()).toEqual([])
    })
  })
})
