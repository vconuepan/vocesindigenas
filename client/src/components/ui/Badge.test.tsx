import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Published</Badge>)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Badge variant="green">Active</Badge>)
    expect(screen.getByText('Active').className).toContain('bg-green-100')
  })

  it('defaults to gray variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('bg-neutral-100')
  })
})
