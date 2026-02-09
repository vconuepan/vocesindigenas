import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MethodologyPage from './MethodologyPage'
import StewardshipPage from './StewardshipPage'

vi.mock('../components/SubscribeProvider', () => ({
  useSubscribe: () => ({ openSubscribe: vi.fn() }),
}))

vi.mock('../hooks/useSources', () => ({
  useSources: () => ({
    data: {
      byRegion: { 'North America': ['Reuters', 'AP'] },
      byIssue: { 'Planet & Climate': ['Mongabay', 'Grist'] },
      totalCount: 82,
    },
    isLoading: false,
  }),
}))

function renderPage(component: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter>{component}</MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  )
}

describe('MethodologyPage', () => {
  it('renders dynamic source count from useSources hook', () => {
    renderPage(<MethodologyPage />)
    expect(screen.getByText(/82 curated news sources/)).toBeInTheDocument()
  })
})

describe('StewardshipPage', () => {
  it('renders heading and dynamic source count', () => {
    renderPage(<StewardshipPage />)
    expect(screen.getByRole('heading', { level: 1, name: /long-term home/i })).toBeInTheDocument()
    expect(screen.getByText(/82\+/)).toBeInTheDocument()
  })
})
