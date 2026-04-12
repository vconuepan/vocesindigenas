import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MethodologyPage from './MethodologyPage'
import ThankYouPage from './ThankYouPage'

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
    expect(screen.getAllByText(/Monitoreamos 82/).length).toBeGreaterThan(0)
  })
})

describe('ThankYouPage', () => {
  it('renders heading and credit sections', () => {
    renderPage(<ThankYouPage />)
    expect(screen.getByRole('heading', { level: 1, name: /thank you/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /frontend/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /backend/i })).toBeInTheDocument()
  })
})
