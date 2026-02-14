import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCount = vi.hoisted(() => vi.fn())
const mockFindFirst = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockCreateNewsletter = vi.hoisted(() => vi.fn())
const mockAssignStories = vi.hoisted(() => vi.fn())
const mockSelectStoriesForNewsletter = vi.hoisted(() => vi.fn())
const mockGenerateContent = vi.hoisted(() => vi.fn())
const mockGenerateHtmlContent = vi.hoisted(() => vi.fn())
const mockSendTest = vi.hoisted(() => vi.fn())

vi.mock('../lib/prisma.js', () => ({
  default: {
    story: { count: mockCount },
    newsletter: { findFirst: mockFindFirst, delete: mockDelete },
  },
}))

vi.mock('../services/newsletter.js', () => ({
  createNewsletter: mockCreateNewsletter,
  assignStories: mockAssignStories,
  selectStoriesForNewsletter: mockSelectStoriesForNewsletter,
  generateContent: mockGenerateContent,
  generateHtmlContent: mockGenerateHtmlContent,
  sendTest: mockSendTest,
}))

const { runGenerateNewsletter, getWeekTitle } = await import('./generateNewsletter.js')

describe('runGenerateNewsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(null)
  })

  it('runs the full newsletter pipeline in order', async () => {
    mockCount.mockResolvedValue(5)

    const callOrder: string[] = []
    mockCreateNewsletter.mockImplementation(async () => {
      callOrder.push('create')
      return { id: 'nl-1' }
    })
    mockAssignStories.mockImplementation(async () => { callOrder.push('assign') })
    mockSelectStoriesForNewsletter.mockImplementation(async () => { callOrder.push('select') })
    mockGenerateContent.mockImplementation(async () => { callOrder.push('generateContent') })
    mockGenerateHtmlContent.mockImplementation(async () => { callOrder.push('generateHtml') })
    mockSendTest.mockImplementation(async () => { callOrder.push('sendTest') })

    await runGenerateNewsletter()

    expect(callOrder).toEqual([
      'create', 'assign', 'select', 'generateContent', 'generateHtml', 'sendTest',
    ])
  })

  it('passes the newsletter ID through all pipeline steps', async () => {
    mockCount.mockResolvedValue(3)
    mockCreateNewsletter.mockResolvedValue({ id: 'nl-42' })

    await runGenerateNewsletter()

    expect(mockAssignStories).toHaveBeenCalledWith('nl-42')
    expect(mockSelectStoriesForNewsletter).toHaveBeenCalledWith('nl-42')
    expect(mockGenerateContent).toHaveBeenCalledWith('nl-42')
    expect(mockGenerateHtmlContent).toHaveBeenCalledWith('nl-42')
    expect(mockSendTest).toHaveBeenCalledWith('nl-42')
  })

  it('skips silently when no recent published stories', async () => {
    mockCount.mockResolvedValue(0)

    await runGenerateNewsletter()

    expect(mockCreateNewsletter).not.toHaveBeenCalled()
  })

  it('skips when a newsletter with the same title already exists', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'existing-nl', title: 'Week 7, 2026' })

    await runGenerateNewsletter()

    expect(mockCreateNewsletter).not.toHaveBeenCalled()
  })

  it('cleans up and re-throws on mid-pipeline failure', async () => {
    mockCount.mockResolvedValue(5)
    mockCreateNewsletter.mockResolvedValue({ id: 'nl-1' })
    mockGenerateContent.mockRejectedValue(new Error('LLM timeout'))
    mockDelete.mockResolvedValue(undefined)

    await expect(runGenerateNewsletter()).rejects.toThrow('LLM timeout')

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'nl-1' } })
    expect(mockGenerateHtmlContent).not.toHaveBeenCalled()
    expect(mockSendTest).not.toHaveBeenCalled()
  })
})

describe('getWeekTitle', () => {
  it('returns correct week for a known date', () => {
    // 2026-02-14 is a Saturday in ISO week 7
    expect(getWeekTitle(new Date(2026, 1, 14))).toBe('Week 7, 2026')
  })

  it('handles week 1 of a new year', () => {
    // 2026-01-01 is a Thursday — ISO week 1 of 2026
    expect(getWeekTitle(new Date(2026, 0, 1))).toBe('Week 1, 2026')
  })

  it('handles end of year crossing into next year week 1', () => {
    // 2025-12-29 is a Monday — ISO week 1 of 2026
    expect(getWeekTitle(new Date(2025, 11, 29))).toBe('Week 1, 2026')
  })

  it('handles week 53 in long years', () => {
    // 2020-12-31 is a Thursday — ISO week 53 of 2020
    expect(getWeekTitle(new Date(2020, 11, 31))).toBe('Week 53, 2020')
  })
})
