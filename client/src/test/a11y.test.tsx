import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import SearchPage from '../pages/SearchPage'

vi.mock('../lib/api', () => ({
  publicApi: {
    stories: {
      list: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'story-1',
            title: 'Climate Change Report',
            slug: 'climate-change-report',
            summary: 'A summary about climate',
            sourceUrl: 'https://example.com',
            datePublished: '2024-01-15',
            feed: { title: 'Test Feed', issue: { name: 'Planet & Climate', slug: 'planet-climate' } },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      }),
    },
  },
}))

function wrapWithProviders(ui: React.ReactElement, initialEntry = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('Accessibility', () => {
  it('SearchPage has no a11y violations', async () => {
    const { container } = wrapWithProviders(<SearchPage />, '/search?q=climate')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
