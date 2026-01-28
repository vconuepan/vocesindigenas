import { Outlet } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200">
        <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <a href="/" className="text-xl font-bold text-brand-800">
            Actually Relevant
          </a>
        </nav>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-neutral-500">
          Actually Relevant — AI-curated news that matters
        </div>
      </footer>
    </div>
  )
}
