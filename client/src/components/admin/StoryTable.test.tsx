import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryTable } from './StoryTable'
import type { Story } from '@shared/types'

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: overrides.id ?? '1',
  title: overrides.title ?? 'Test Story',
  sourceTitle: 'Source Title',
  url: 'https://example.com',
  status: 'analyzed',
  dateCrawled: '2025-01-15T00:00:00Z',
  relevance: 7,
  relevancePre: null,
  emotionTag: null,
  ...overrides,
} as Story)

const defaultProps = {
  selectedIds: new Set<string>(),
  processingIds: new Set<string>(),
  onToggleSelect: vi.fn(),
  onToggleSelectAll: vi.fn(),
  allSelected: false,
  onView: vi.fn(),
  onStatusChange: vi.fn(),
  onDelete: vi.fn(),
}

describe('StoryTable', () => {
  describe('select all checkbox', () => {
    it('is unchecked when allSelected is false', () => {
      render(
        <StoryTable
          {...defaultProps}
          stories={[makeStory({ id: '1' }), makeStory({ id: '2', title: 'Story 2' })]}
        />,
      )
      const checkbox = screen.getByRole('checkbox', { name: 'Select all stories' })
      expect(checkbox).not.toBeChecked()
    })

    it('is checked when allSelected is true and stories exist', () => {
      render(
        <StoryTable
          {...defaultProps}
          stories={[makeStory({ id: '1' }), makeStory({ id: '2', title: 'Story 2' })]}
          allSelected={true}
        />,
      )
      const checkbox = screen.getByRole('checkbox', { name: 'Select all stories' })
      expect(checkbox).toBeChecked()
    })

    it('is unchecked when allSelected is true but stories is empty', () => {
      render(
        <StoryTable
          {...defaultProps}
          stories={[]}
          allSelected={true}
        />,
      )
      const checkbox = screen.getByRole('checkbox', { name: 'Select all stories' })
      expect(checkbox).not.toBeChecked()
    })

    it('calls onToggleSelectAll when clicked', async () => {
      const user = userEvent.setup()
      const onToggleSelectAll = vi.fn()
      render(
        <StoryTable
          {...defaultProps}
          stories={[makeStory()]}
          onToggleSelectAll={onToggleSelectAll}
        />,
      )
      await user.click(screen.getByRole('checkbox', { name: 'Select all stories' }))
      expect(onToggleSelectAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('individual row checkboxes', () => {
    it('reflects selectedIds for each row', () => {
      const stories = [
        makeStory({ id: '1', title: 'Story A' }),
        makeStory({ id: '2', title: 'Story B' }),
      ]
      render(
        <StoryTable
          {...defaultProps}
          stories={stories}
          selectedIds={new Set(['1'])}
        />,
      )
      expect(screen.getByRole('checkbox', { name: 'Select Story A' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Select Story B' })).not.toBeChecked()
    })

    it('calls onToggleSelect with the story id when clicked', async () => {
      const user = userEvent.setup()
      const onToggleSelect = vi.fn()
      render(
        <StoryTable
          {...defaultProps}
          stories={[makeStory({ id: 'abc', title: 'My Story' })]}
          onToggleSelect={onToggleSelect}
        />,
      )
      await user.click(screen.getByRole('checkbox', { name: 'Select My Story' }))
      expect(onToggleSelect).toHaveBeenCalledWith('abc')
    })
  })
})
