# UI Conventions

Standards and patterns for building public and admin pages.

## SEO Checklist

Each page should:

- [ ] Use Helmet with title, description
- [ ] Have unique, descriptive title
- [ ] Have unique meta description (150-160 chars)
- [ ] Be listed in `client/src/routes.ts` for prerendering
- [ ] No hardcoded counts (source count, story count, language count) -- use `useSources()` hook or omit. These values change as feeds are added/removed.

## CSS Utility Classes

Defined in `client/src/index.css`:

**Layout:**

- `.page-section` -- Standard page wrapper (max-w-3xl, responsive padding)
- `.page-section-wide` -- Wider page wrapper (max-w-4xl)

**Typography:**

- `.page-title` -- Page headings (text-4xl/5xl, bold, centered)
- `.page-intro` -- Subtitle text below page title
- `.prose` -- Body text container (text-neutral-600, relaxed leading, auto-styled links)
- `.section-heading` -- Section headings (text-2xl)
- `.section-heading-lg` -- Larger section headings (text-3xl)

## Bundle Splitting

The client uses `React.lazy()` to split code and reduce initial bundle size. Homepage visitors only download homepage code; other pages load on demand.

**Rules:**

- **HomePage** (`client/src/pages/HomePage.tsx`): Static import in `App.tsx` -- this is the critical landing page
- **Other public pages** (`client/src/pages/*.tsx`): Use **`React.lazy()`** in `App.tsx` -- prerendering still works (Puppeteer waits for chunks)
- **Admin pages** (`client/src/pages/admin/*.tsx`): Use **`React.lazy()`** in `App.tsx`. Must use `export default` (not named exports).
- **Admin-only npm packages** (`@headlessui/react`, `@heroicons/react`): Automatically code-split via lazy loading.
- **Error boundary:** `ChunkErrorBoundary` and `LazyPage` wrapper handle chunk load failures with reload button.
- **Preloading:** `LoginPage` calls `preloadAdminChunks()` on mount.

## Accessibility (WCAG 2.2 AA)

See `.context/accessibility.md` for full WCAG patterns, ARIA, and testing checklist.

**Common requirements:**

- **Links/buttons**: `focus-visible:ring-2 focus-visible:ring-brand-500`
- **Link color**: Use `text-brand-700` (not brand-600) for AA contrast
- **Images**: Always include `alt` text (use `alt=""` for decorative)
- **Forms**: Every input needs a `<label>` with matching `htmlFor`/`id`
- **Touch targets**: Minimum 24x24px

## Spelling & Language

All hardcoded static text (UI labels, headings, descriptions, error messages, tooltips, meta tags) must use **American English** spelling. Examples: "analyzed" (not "analysed"), "color" (not "colour"), "organize" (not "organise"). Proper nouns that use British spelling (e.g. organization names like "Centre for...") are exempt.

Use em dashes sparingly in user-facing copy. One per paragraph at most. Overuse is a tell for AI-generated text. Prefer commas, periods, or rewriting the sentence instead.
