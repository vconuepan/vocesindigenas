import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCategoryColor } from "../lib/category-colors";
import { API_BASE } from "../lib/api";
import { BRAND } from "../config";
import SubscribeProvider, {
  useSubscribe,
} from "../components/SubscribeProvider";
import { PositivityProvider } from "../contexts/PositivityContext";
import { MoodDialPanel } from "../components/PositivitySlider";
const KOFI_URL = "https://ko-fi.com/odinmb";

const ISSUE_LINKS = [
  {
    label: "Human Development",
    slug: "human-development",
    href: "/issues/human-development",
  },
  {
    label: "Planet & Climate",
    slug: "planet-climate",
    href: "/issues/planet-climate",
  },
  {
    label: "Existential Threats",
    slug: "existential-threats",
    href: "/issues/existential-threats",
  },
  {
    label: "Science & Technology",
    slug: "science-technology",
    href: "/issues/science-technology",
  },
];

const FOOTER_NAV = [
  { label: "About", href: "/about" },
  { label: "Methodology", href: "/methodology" },
  { label: "Issues", href: "/issues" },
];

const FOOTER_LEGAL = [
  { label: "Legal notice / Impressum", href: "/imprint" },
  { label: "Privacy", href: "/privacy" },
  { label: "No cookies", href: "/privacy" },
];

function NewsletterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

export default function PublicLayout() {
  return (
    <PositivityProvider>
      <SubscribeProvider>
        <PublicLayoutInner />
      </SubscribeProvider>
    </PositivityProvider>
  );
}

function PublicLayoutInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { openSubscribe } = useSubscribe();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const location = useLocation();

  const isActiveIssue = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  // Close mobile menu and search on Escape
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        if (searchQuery) {
          setSearchQuery("");
        } else {
          setSearchOpen(false);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen, searchOpen, searchQuery]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      // Small delay to allow the DOM to render
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  // Close search on route change and scroll to top
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Actually Relevant RSS Feed"
          href={`${API_BASE}/feed`}
        />
      </Helmet>

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Skip to content
      </a>

      <header>
        {/* Logo bar — centered logo, engagement actions right */}
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex items-start justify-center relative">
            {/* Logo */}
            <Link to="/" className="flex flex-col items-center shrink-0">
              <picture>
                <source
                  srcSet="/images/optimized/logo-text-horizontal-small-h.webp"
                  type="image/webp"
                />
                <img
                  src="/images/logo-text-horizontal.png"
                  alt="Actually Relevant"
                  className="h-14 md:h-16 aspect-[5/2]"
                />
              </picture>
              <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-neutral-500 mt-1">
                {BRAND.claim.replace(/\.$/, "")}
              </span>
            </Link>

            {/* Desktop: Mood Dial — vertically centered on logo (top matches py-4, h matches logo h-16) */}
            <div className="hidden lg:flex items-center absolute left-12 top-4 h-16">
              <MoodDialPanel />
            </div>

            {/* Desktop: subscribe button — vertically centered on logo */}
            <div className="hidden lg:flex items-center absolute right-12 top-4 h-16">
              <button
                onClick={() => openSubscribe()}
                className="inline-flex items-center gap-1.5 text-base font-normal tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 py-1 text-neutral-500 hover:text-brand-700"
              >
                <NewsletterIcon className="w-4 h-4 shrink-0" />
                Subscribe
              </button>
            </div>

            {/* Mobile: search on left, menu on right — vertically centered on logo */}
            <div className="lg:hidden absolute left-4 top-3 md:top-4 h-14 md:h-16 flex items-center">
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setMenuOpen(false);
                }}
                className={`p-2 rounded transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  searchOpen
                    ? "text-brand-700"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
                aria-label={searchOpen ? "Close search" : "Open search"}
                aria-expanded={searchOpen}
              >
                <SearchIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="lg:hidden absolute right-4 top-3 md:top-4 h-14 md:h-16 flex items-center">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  {menuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Issue category navigation — desktop */}
        <nav
          className="hidden lg:block border-b border-neutral-200"
          aria-label="Issue categories"
        >
          <ul className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-0">
            {/* Search button as first item */}
            <li>
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`issue-nav-link ${
                  searchOpen ? "!text-brand-700" : ""
                }`}
                aria-label={searchOpen ? "Close search" : "Open search"}
                aria-expanded={searchOpen}
              >
                <SearchIcon className="w-5 h-5" />
              </button>
            </li>
            {ISSUE_LINKS.map((link) => {
              const colors = getCategoryColor(link.slug);
              const active = isActiveIssue(link.href);
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="issue-nav-link"
                    data-active={active}
                    style={
                      { "--issue-color": colors.hex } as React.CSSProperties
                    }
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full -translate-y-px ${
                        colors.dotBg
                      } ${active ? "opacity-100" : "opacity-60"}`}
                      aria-hidden="true"
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-b border-neutral-200 shadow-lg">
            <nav className="px-4 py-3" aria-label="Mobile navigation">
              {/* Mood Dial — centered */}
              <div className="mb-3 py-2 flex justify-center">
                <MoodDialPanel />
              </div>

              {/* Issue categories */}
              <ul className="mb-3 border-t border-neutral-100 pt-3">
                {ISSUE_LINKS.map((link) => {
                  const colors = getCategoryColor(link.slug);
                  return (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 py-2.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 ${
                          isActiveIssue(link.href)
                            ? "text-neutral-900"
                            : "text-neutral-600 hover:text-neutral-900"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${colors.dotBg}`}
                          aria-hidden="true"
                        />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Subscribe & Support — each on its own line */}
              <div className="border-t border-neutral-100 pt-3 px-2 flex flex-col">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openSubscribe();
                  }}
                  className="flex items-center gap-2 py-2.5 text-sm font-bold text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  <NewsletterIcon className="w-3.5 h-3.5 shrink-0" />
                  Subscribe
                </button>
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2.5 text-sm font-bold text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Support Us
                  <span className="sr-only">(opens in new tab)</span>
                </a>
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
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    navigate(
                      `/search?q=${encodeURIComponent(searchQuery.trim())}`
                    );
                    setSearchOpen(false);
                  }
                }}
                className="relative"
              >
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories..."
                  className="w-full pl-10 pr-10 py-3 text-base border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none transition-colors"
                  aria-label="Search stories"
                />
                <button
                  type="button"
                  onClick={() => {
                    searchQuery ? setSearchQuery("") : setSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  aria-label="Close search"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </form>
              <p className="text-xs text-neutral-400 mt-2 text-center">
                Search by meaning, not just keywords.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Category color strip — mobile only */}
      <div className="flex h-1 lg:hidden" aria-hidden="true">
        <div className="flex-1 bg-amber-400" />
        <div className="flex-1 bg-teal-400" />
        <div className="flex-1 bg-red-400" />
        <div className="flex-1 bg-indigo-400" />
      </div>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Editorial sign-off */}
      <div
        className="bg-neutral-50 border-t border-neutral-200 py-10 md:py-14 text-center"
        aria-hidden="true"
      >
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="flex-1 border-t border-neutral-200" />
            <span className="text-brand-300 text-sm">&#9670;</span>
            <span className="flex-1 border-t border-neutral-200" />
          </div>
          <p className="text-lg italic text-neutral-500 leading-relaxed">
            {BRAND.claimSupport}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-300">
        {/* Category color strip */}
        <div className="flex h-1" aria-hidden="true">
          <div className="flex-1 bg-amber-400" />
          <div className="flex-1 bg-teal-400" />
          <div className="flex-1 bg-red-400" />
          <div className="flex-1 bg-indigo-400" />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-5 md:gap-10">
            {/* Brand column */}
            <div className="col-span-2">
              <Link
                to="/"
                className="inline-block mb-3 font-nexa text-xl font-bold text-white hover:text-brand-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                Actually Relevant
              </Link>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
                {BRAND.claim}
              </p>
              <ul className="hidden md:flex gap-4 mt-4">
                {FOOTER_LEGAL.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="hidden md:block text-xs text-neutral-400 mt-2">
                &copy; {new Date().getFullYear()} Actually Relevant. All rights
                reserved.
              </p>
            </div>

            {/* Navigation column */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none">
                Navigate
              </h3>
              <ul className="grid auto-rows-[1.25rem] gap-y-2">
                {FOOTER_NAV.map((link) => (
                  <li key={link.label} className="flex items-center">
                    <Link
                      to={link.href}
                      className="text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscribe column */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none">
                Subscribe
              </h3>
              <ul className="grid auto-rows-[1.25rem] gap-y-2">
                <li className="flex items-center">
                  <button
                    onClick={() => openSubscribe()}
                    className="inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <NewsletterIcon className="w-3.5 h-3.5 shrink-0" />
                    Newsletter
                  </button>
                </li>
                <li className="flex items-center">
                  <a
                    href={`${API_BASE}/feed`}
                    className="inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
                    </svg>
                    RSS Feed
                  </a>
                </li>
                <li className="flex items-center">
                  <a
                    href={KOFI_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Support Us
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Issues column */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none">
                Issues
              </h3>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-1 auto-rows-[1.25rem]">
                {ISSUE_LINKS.map((link) => {
                  const colors = getCategoryColor(link.slug);
                  return (
                    <li key={link.href} className="flex items-center">
                      <Link
                        to={link.href}
                        className="inline-flex items-center gap-2 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${colors.dotBg} opacity-70 shrink-0`}
                          aria-hidden="true"
                        />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Legal links + copyright — mobile only */}
          <div className="mt-7 md:hidden text-center">
            <ul className="flex justify-center gap-5">
              {FOOTER_LEGAL.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-400 mt-3">
              &copy; {new Date().getFullYear()} Actually Relevant. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
