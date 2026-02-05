import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1 and no page size selector', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    )
    expect(container.querySelector('nav')).not.toBeInTheDocument()
  })

  it('renders page buttons for multiple pages', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('highlights the current page', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current')
  })

  it('disables Previous on first page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
  })

  it('disables Next on last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled()
  })

  it('calls onPageChange when a page button is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with page - 1 when Previous is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange with page + 1 when Next is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('shows ellipsis for many pages', () => {
    render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
    // First and last pages always shown
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
  })

  describe('page size selector', () => {
    it('renders page size selector when onPageSizeChange is provided', () => {
      render(
        <Pagination
          page={1}
          totalPages={3}
          onPageChange={vi.fn()}
          pageSize={25}
          onPageSizeChange={vi.fn()}
        />,
      )
      expect(screen.getByLabelText('Show')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('25')
    })

    it('does not render page size selector when onPageSizeChange is not provided', () => {
      render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />)
      expect(screen.queryByLabelText('Show')).not.toBeInTheDocument()
    })

    it('renders all page size options', () => {
      render(
        <Pagination
          page={1}
          totalPages={3}
          onPageChange={vi.fn()}
          pageSize={25}
          onPageSizeChange={vi.fn()}
        />,
      )
      const select = screen.getByRole('combobox')
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent)
      expect(options).toEqual(['10', '25', '50', '100'])
    })

    it('calls onPageSizeChange when a new size is selected', async () => {
      const user = userEvent.setup()
      const onPageSizeChange = vi.fn()
      render(
        <Pagination
          page={1}
          totalPages={3}
          onPageChange={vi.fn()}
          pageSize={25}
          onPageSizeChange={onPageSizeChange}
        />,
      )
      await user.selectOptions(screen.getByRole('combobox'), '50')
      expect(onPageSizeChange).toHaveBeenCalledWith(50)
    })

    it('renders page size selector even when totalPages is 1', () => {
      render(
        <Pagination
          page={1}
          totalPages={1}
          onPageChange={vi.fn()}
          pageSize={100}
          onPageSizeChange={vi.fn()}
        />,
      )
      expect(screen.getByLabelText('Show')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('100')
      // Page buttons should not be shown
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
    })
  })
})
