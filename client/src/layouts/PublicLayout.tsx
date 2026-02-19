import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCategoryColor } from "../lib/category-colors";
import { API_BASE } from "../lib/api";
import { BRAND } from "../config";
import { getSavedSlugs } from "../lib/preferences";
import SubscribeProvider, {
  useSubscribe,
} from "../components/SubscribeProvider";
import FeedbackProvider from "../components/FeedbackProvider";
import { PositivityProvider } from "../contexts/PositivityContext";
import { MoodDialPanel } from "../components/PositivitySlider";
const KOFI_URL = "https://ko-fi.com/odinmb";
const BLUESKY_URL = "https://bsky.app/profile/actuallyrelevant.bsky.social";
const MASTODON_URL = "https://mastodon.social/@actuallyrelevant";

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
  { label: "Compare", href: "/compare" },
  { label: "News Fatigue", href: "/news-fatigue" },
  { label: "Thank You", href: "/thank-you" },
];

const FOOTER_LEGAL = [
  { label: "Legal notice / Impressum", href: "/imprint" },
  { label: "Privacy", href: "/privacy" },
  { label: "No tracking", href: "/no-ads-no-tracking" },
];

function BrandLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex flex-col items-center shrink-0">
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
  );
}

function CategoryColorStrip({ className }: { className?: string }) {
  return (
    <div className={`flex h-1 ${className ?? ""}`} aria-hidden="true">
      <div className="flex-1 bg-amber-400" />
      <div className="flex-1 bg-teal-400" />
      <div className="flex-1 bg-red-400" />
      <div className="flex-1 bg-indigo-400" />
    </div>
  );
}

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
        <FeedbackProvider>
          <PublicLayoutInner />
        </FeedbackProvider>
      </SubscribeProvider>
    </PositivityProvider>
  );
}

function PublicLayoutInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const { openSubscribe } = useSubscribe();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  const location = useLocation();

  // Track saved stories count reactively
  const refreshSavedCount = useCallback(() => {
    setSavedCount(getSavedSlugs().length);
  }, []);

  useEffect(() => {
    refreshSavedCount();
    window.addEventListener("storage", refreshSavedCount);
    window.addEventListener("ar-saved-changed", refreshSavedCount);
    return () => {
      window.removeEventListener("storage", refreshSavedCount);
      window.removeEventListener("ar-saved-changed", refreshSavedCount);
    };
  }, [refreshSavedCount]);

  const isActiveIssue = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  // Sync mobile menu dialog open/close
  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;
    if (menuOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [menuOpen]);

  // Handle dialog cancel (Escape key / native close)
  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      setMenuOpen(false);
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  // Close search on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else {
          setSearchOpen(false);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen, searchQuery]);

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
            <BrandLogo />

            {/* Desktop: Mood Dial — vertically centered on logo (top matches py-4, h matches logo h-16) */}
            <div className="hidden lg:flex items-center absolute left-12 top-4 h-16">
              <MoodDialPanel />
            </div>

            {/* Desktop: saved + subscribe — vertically centered on logo */}
            <div className="hidden lg:flex items-center gap-1 absolute right-12 top-4 h-16">
              <Link
                to="/saved"
                className="inline-flex items-center gap-1.5 text-base font-normal tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 py-1 text-neutral-500 hover:text-brand-700"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Saved{savedCount > 0 && ` (${savedCount})`}
              </Link>
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
                aria-controls="search-panel"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="lg:hidden absolute right-4 top-3 md:top-4 h-14 md:h-16 flex items-center">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-menu"
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
                aria-controls="search-panel"
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

        {/* Mobile nav — dialog for built-in focus trap */}
        <dialog
          ref={menuDialogRef}
          id="mobile-nav-menu"
          className="lg:hidden fixed top-0 left-0 w-full h-[100dvh] max-w-none max-h-none m-0 p-0 bg-transparent backdrop:bg-transparent overflow-hidden open:flex open:flex-col"
          aria-label="Mobile navigation"
        >
          {/* Dialog header: logo + close + color strip */}
          <div className="bg-white">
            <div className="border-b border-neutral-100 px-4 py-3 md:py-4 flex items-start justify-center relative">
              <BrandLogo onClick={() => setMenuOpen(false)} />
              <div className="absolute right-4 top-3 md:top-4 h-14 md:h-16 flex items-center">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <CategoryColorStrip />
          </div>
          <div className="bg-white border-b border-neutral-200 shadow-lg">
            <nav className="px-4 py-3">
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

              {/* Saved, Subscribe & Support — each on its own line */}
              <div className="border-t border-neutral-100 pt-3 px-2 flex flex-col">
                <Link
                  to="/saved"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm font-bold text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Saved Stories{savedCount > 0 && ` (${savedCount})`}
                </Link>
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
          {/* Tap-to-close area below menu */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        </dialog>

        {/* Search bar */}
        {searchOpen && (
          <div id="search-panel" className="bg-white border-b border-neutral-200 shadow-lg">
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
      <CategoryColorStrip className="lg:hidden" />

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
        <CategoryColorStrip />

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
              <div className="flex gap-2 mt-4">
                <a
                  href={BLUESKY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Follow us on Bluesky (opens in new tab)"
                >
                  <img src="/images/optimized/social/bluesky-thumb-w.webp" alt="" width={18} height={18} className="w-[18px] h-[18px]" aria-hidden="true" />
                </a>
                <a
                  href={MASTODON_URL}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="flex items-center justify-center w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Follow us on Mastodon (opens in new tab)"
                >
                  <img src="/images/optimized/social/mastodon-thumb-w.webp" alt="" width={18} height={18} className="w-[18px] h-[18px]" aria-hidden="true" />
                </a>
              </div>
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
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none" role="presentation">
                Navigate
              </p>
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

            {/* Connect column */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none" role="presentation">
                Connect
              </p>
              <ul className="grid auto-rows-[1.25rem] gap-y-2">
                <li className="flex items-center">
                  <Link
                    to="/newsletter"
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/newsletter-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    Newsletter
                  </Link>
                </li>
                <li className="flex items-center">
                  <a
                    href={`${API_BASE}/feed`}
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/rss-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    RSS Feed
                  </a>
                </li>
                <li className="flex items-center">
                  <Link
                    to="/widgets"
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/code-embed-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    For Your Website
                  </Link>
                </li>
                <li className="flex items-center">
                  <span className="text-sm leading-5 text-neutral-400 px-0.5">
                    <img src="/images/optimized/icons/code-api-thumb-w.webp" alt="" width={14} height={14} className="inline-block w-3.5 h-3.5 shrink-0 mr-1.5 -mt-0.5" aria-hidden="true" />
                    <Link to="/free-api" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded">Free API</Link> (<Link to="/free-api" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded">Intro</Link>, <Link to="/developers" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded">Docs</Link>)
                  </span>
                </li>
                <li className="flex items-center">
                  <Link
                    to="/stewardship"
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/stewardship-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    Stewardship
                  </Link>
                </li>
                <li className="flex items-center">
                  <a
                    href={KOFI_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/heart-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    Support Us
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                </li>
                <li className="flex items-center">
                  <Link
                    to="/feedback"
                    className="group inline-flex items-center gap-1.5 text-sm leading-5 text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-0.5"
                  >
                    <img src="/images/optimized/icons/feedback-thumb-w.webp" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0 transition-[filter] group-hover:brightness-[10]" aria-hidden="true" />
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>

            {/* Issues column */}
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 leading-none" role="presentation">
                Issues
              </p>
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
