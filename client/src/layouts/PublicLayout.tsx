import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const TOP_LEFT_LINKS = [
  { label: 'Methodology', href: '/methodology' },
  { label: 'Issues', href: '/issues' },
]

const TOP_RIGHT_LINKS = [
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Podcast', href: '/podcast' },
  { label: 'About', href: '/about' },
]

const ISSUE_LINKS = [
  { label: 'Human Development', href: '/issues/human-development' },
  { label: 'Planet & Climate', href: '/issues/planet-climate' },
  { label: 'Existential Threats', href: '/issues/existential-threats' },
  { label: 'Science & Technology', href: '/issues/science-technology' },
  { label: 'General News', href: '/issues/general-news' },
]

const FOOTER_LINKS = [
  { label: 'Methodology', href: '/methodology' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const isActiveIssue = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 lg:static">
        {/* Top bar — logo centered, nav links left and right */}
        <div className="bg-white border-b border-neutral-200">
          <nav
            className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"
            aria-label="Main navigation"
          >
            {/* Left links — desktop */}
            <ul className="hidden lg:flex items-center gap-5 flex-1">
              {TOP_LEFT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={`text-sm uppercase tracking-wide font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 py-0.5 ${
                      location.pathname === link.href
                        ? 'text-brand-700'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Center logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img
                src="/images/logo-text-horizontal.png"
                alt="Actually Relevant"
                className="h-10 md:h-12"
              />
            </Link>

            {/* Right links — desktop */}
            <ul className="hidden lg:flex items-center justify-end gap-5 flex-1">
              {TOP_RIGHT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={`text-sm uppercase tracking-wide font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1 py-0.5 ${
                      location.pathname === link.href
                        ? 'text-brand-700'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded focus-visible:ring-2 focus-visible:ring-brand-500"
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
          </nav>
        </div>

        {/* Issues bar — dark background, desktop */}
        <div className="hidden lg:block bg-neutral-800">
          <ul className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-8 py-2.5">
            {ISSUE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`text-sm uppercase tracking-wider font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 rounded px-1 py-0.5 ${
                    isActiveIssue(link.href)
                      ? 'text-white'
                      : 'text-brand-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200">
            <ul className="px-4 py-2">
              {ISSUE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-2 text-sm font-bold uppercase tracking-wide focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 ${
                      isActiveIssue(link.href)
                        ? 'text-brand-700'
                        : 'text-neutral-600 hover:text-brand-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-neutral-100 mt-2 pt-2">
                {[...TOP_LEFT_LINKS, ...TOP_RIGHT_LINKS].map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-2 text-sm font-medium uppercase tracking-wide focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 ${
                      location.pathname === link.href
                        ? 'text-brand-700'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </li>
            </ul>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-neutral-900 text-neutral-300 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Link to="/" className="text-lg font-bold text-white font-nexa">
                Actually Relevant
              </Link>
              <p className="text-sm text-neutral-400 mt-1">
                AI-curated news that matters for humanity's future.
              </p>
            </div>

            <ul className="flex flex-wrap gap-4">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-neutral-800 mt-6 pt-6 text-xs text-neutral-500 text-center">
            &copy; {new Date().getFullYear()} Actually Relevant. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
