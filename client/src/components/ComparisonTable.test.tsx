import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ComparisonTable from './ComparisonTable'

const HEADERS = ['Feature', 'Product A', 'Product B']
const ROWS = [
  { feature: 'Price', cells: ['Free', '$10/mo'] },
  { feature: 'Ads', cells: ['None', 'Yes'] },
]

describe('ComparisonTable', () => {
  it('renders all headers', () => {
    render(<ComparisonTable headers={HEADERS} rows={ROWS} />)
    expect(screen.getByText('Feature')).toBeInTheDocument()
    expect(screen.getByText('Product A')).toBeInTheDocument()
    expect(screen.getByText('Product B')).toBeInTheDocument()
  })

  it('renders all rows and cells', () => {
    render(<ComparisonTable headers={HEADERS} rows={ROWS} />)
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('$10/mo')).toBeInTheDocument()
    expect(screen.getByText('Ads')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('applies highlight styling to the specified column header', () => {
    render(<ComparisonTable headers={HEADERS} rows={ROWS} highlightColumn={0} />)
    const headerCells = screen.getAllByRole('columnheader')
    // highlightColumn=0 highlights "Product A" (first competitor column, index 1 in DOM)
    expect(headerCells[1].className).toContain('bg-brand-50')
  })

  it('renders card view toggle on mobile', async () => {
    render(<ComparisonTable headers={HEADERS} rows={ROWS} />)
    const cardsButton = screen.getByRole('radio', { name: 'Cards' })
    expect(cardsButton).toBeInTheDocument()

    await userEvent.click(cardsButton)
    // In card view, competitor names become card headings
    expect(screen.getByRole('heading', { name: 'Product A' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Product B' })).toBeInTheDocument()
  })

  it('renders green checkmark SVG when cell has check: true', () => {
    const rows = [
      { feature: 'Speed', cells: [{ text: 'Fast', check: true }, 'Slow'] },
    ]
    const { container } = render(<ComparisonTable headers={HEADERS} rows={rows} />)
    const checkmarks = container.querySelectorAll('svg.text-green-600')
    expect(checkmarks.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render checkmark for plain string cells', () => {
    const { container } = render(<ComparisonTable headers={HEADERS} rows={ROWS} />)
    const checkmarks = container.querySelectorAll('svg.text-green-600')
    expect(checkmarks).toHaveLength(0)
  })
})
