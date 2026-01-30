import { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getCategoryColor } from '../lib/category-colors'
import { API_BASE } from '../lib/api'

const UTILITY_LINKS = [
  { label: 'Methodology', href: '/methodology' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Podcast', href: '/podcast' },
  { label: 'About', href: '/about' },
  { label: 'Imprint', href: '/imprint' },
]

const ISSUE_LINKS = [
  { label: 'Human Development', slug: 'human-development', href: '/issues/human-development' },
  { label: 'Planet & Climate', slug: 'planet-climate', href: '/issues/planet-climate' },
  { label: 'Existential Threats', slug: 'existential-threats', href: '/issues/existential-threats' },
  { label: 'Science & Technology', slug: 'science-technology', href: '/issues/science-technology' },
  { label: 'General News', slug: 'general-news', href: '/issues/general-news' },
]

const FOOTER_NAV = [
  { label: 'All Issues', href: '/issues' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'About', href: '/about' },
  { label: 'Imprint', href: '/imprint' },
]

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

const FOOTER_SUBSCRIBE = [
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Podcast', href: '/podcast' },
  { label: 'RSS Feed', href: `${API_BASE}/feed` },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  const isActiveIssue = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/')
  const isActive = (href: string) => location.pathname === href

  // Close mobile menu and search on Escape
  useEffect(() => {
    if (!menuOpen && !searchOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen, searchOpen])

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      // Small delay to allow the DOM to render
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [searchOpen])

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="Actually Relevant RSS Feed" href={`${API_BASE}/feed`} />
      </Helmet>

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Skip to content
      </a>

      <header>
        {/* Utility bar — thin top strip with search + secondary links */}
        <div className="hidden lg:block bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`flex items-center gap-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 py-0.5 ${
                searchOpen ? 'text-brand-700' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <ul className="flex items-center gap-1">
              {UTILITY_LINKS.map((link, idx) => (
                <li key={link.href} className="flex items-center">
                  {idx > 0 && <span className="text-neutral-300 mx-2" aria-hidden="true">·</span>}
                  <Link
                    to={link.href}
                    className={`text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5 py-0.5 ${
                      isActive(link.href)
                        ? 'text-brand-700 font-medium'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Logo bar — centered, prominent */}
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex items-center justify-center relative">
            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img
                src="/images/logo-text-horizontal.png"
                alt="Actually Relevant"
                className="h-14 md:h-16"
              />
            </Link>

            {/* Mobile: search + menu buttons */}
            <div className="lg:hidden absolute right-4 flex items-center gap-1">
              <button
                onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false) }}
                className={`p-2 rounded transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  searchOpen ? 'text-brand-700' : 'text-neutral-400 hover:text-neutral-600'
                }`}
                aria-label={searchOpen ? 'Close search' : 'Open search'}
                aria-expanded={searchOpen}
              >
                <SearchIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Issue category navigation — desktop */}
        <nav className="hidden lg:block border-b border-neutral-200" aria-label="Issue categories">
          <ul className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-0">
            {ISSUE_LINKS.map((link) => {
              const colors = getCategoryColor(link.slug)
              const active = isActiveIssue(link.href)
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="issue-nav-link"
                    data-active={active}
                    style={{ '--issue-color': colors.hex } as React.CSSProperties}
                  >
                    <span className={`w-2 h-2 rounded-full ${colors.dotBg} ${active ? 'opacity-100' : 'opacity-60'}`} aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 shadow-lg">
            <nav className="px-4 py-3" aria-label="Mobile navigation">
              {/* Issue categories */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 px-2">Issues</p>
              <ul className="mb-3">
                {ISSUE_LINKS.map((link) => {
                  const colors = getCategoryColor(link.slug)
                  return (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 py-2.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 ${
                          isActiveIssue(link.href)
                            ? 'text-neutral-900'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colors.dotBg}`} aria-hidden="true" />
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* Other links */}
              <div className="border-t border-neutral-100 pt-3">
                <ul className="grid grid-cols-2 gap-1">
                  {UTILITY_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`block py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 ${
                          isActive(link.href)
                            ? 'text-brand-700 font-medium'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="bg-white border-b border-neutral-200 shadow-lg">
            <div className="max-w-3xl mx-auto px-4 py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  // Search not yet implemented
                }}
                className="relative"
              >
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories..."
                  className="w-full pl-10 pr-10 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors"
                  aria-label="Search stories"
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  aria-label="Close search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
              <p className="text-xs text-neutral-400 mt-2 text-center">Search is coming soon.</p>
            </div>
          </div>
        )}
      </header>

      {/* Category color strip — mobile only */}
      <div className="flex h-1 md:hidden" aria-hidden="true">
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-teal-400" />
        <div className="flex-1 bg-red-400" />
        <div className="flex-1 bg-indigo-400" />
        <div className="flex-1 bg-brand-400" />
      </div>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-300">
        {/* Category color strip */}
        <div className="flex h-1" aria-hidden="true">
          <div className="flex-1 bg-amber-400" />
          <div className="flex-1 bg-teal-400" />
          <div className="flex-1 bg-red-400" />
          <div className="flex-1 bg-indigo-400" />
          <div className="flex-1 bg-brand-400" />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-5 md:gap-10">
            {/* Brand column */}
            <div className="col-span-2">
              <Link to="/" className="inline-block mb-3 font-nexa text-xl font-bold text-white hover:text-brand-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                Actually Relevant
              </Link>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
                AI-curated news that matters. We evaluate thousands of articles to surface the stories most relevant to humanity.
              </p>
              <p className="text-xs text-neutral-600 mt-4">
                &copy; {new Date().getFullYear()} Actually Relevant. All rights reserved.
              </p>
            </div>

            {/* Navigation column */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Navigate</h3>
              <ul className="space-y-2">
                {FOOTER_NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscribe column */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Subscribe</h3>
              <ul className="space-y-2">
                {FOOTER_SUBSCRIBE.map((link) =>
                  link.href.includes('/feed') ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
                        </svg>
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>

            </div>

            {/* Issues column */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Issues</h3>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-1">
                {ISSUE_LINKS.map((link) => {
                  const colors = getCategoryColor(link.slug)
                  return (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dotBg} opacity-70`} aria-hidden="true" />
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}
