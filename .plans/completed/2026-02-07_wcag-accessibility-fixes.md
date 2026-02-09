# Accessibility Fixes (WCAG 2.2 AA)

## Goal

Address the specific accessibility gaps identified in the audit. The codebase already has strong a11y foundations (consistent focus rings, ARIA attributes, semantic HTML, skip link). These are targeted fixes.

## Current State

**Strong foundations:**
- `focus-visible:ring-2 focus-visible:ring-brand-500` on all interactive elements (100+ instances across 36 files)
- Native `<dialog>` for subscribe modal with `aria-labelledby`
- Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- Skip link: "Skip to content" → `#main-content`
- `sr-only` text on 14+ elements
- `aria-expanded` on hamburger and search toggles
- Form inputs have `htmlFor`/`id` associations
- Positivity slider has full ARIA (`aria-valuemin/max/now/text`)
- Headless UI `<Dialog>` in admin (focus trap built-in)

**Gaps to fix:**

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Mobile menu lacks focus trap | Medium | `PublicLayout.tsx` |
| 2 | Subscribe modal lacks focus trap | Medium | `SubscribeModal.tsx` |
| 3 | No `aria-controls` on toggle buttons | Low | `PublicLayout.tsx` |
| 4 | No automated a11y testing | Medium | CI/test setup |

## Implementation

### 1. Focus trap for mobile menu

The mobile menu is a `<div>` that appears conditionally. It doesn't trap focus — Tab can move to elements behind the overlay.

**Fix:** Wrap the mobile menu in a focus trap. Two approaches:

**Option A: Native `<dialog>`** (preferred — matches subscribe modal pattern)
Convert the mobile menu to a `<dialog>` element with `showModal()`. This gives:
- Built-in focus trap
- Built-in Escape handling
- Built-in backdrop click handling
- No new dependencies

**Option B: `focus-trap-react`** library
Wrap the menu `<div>` in a `<FocusTrap>` component. Lighter change but adds a dependency.

**Recommendation:** Option A — use native `<dialog>`. It's the pattern already used for the subscribe modal and requires no dependencies.

**Changes to `PublicLayout.tsx`:**
- Convert mobile menu from conditional `<div>` to `<dialog ref={menuDialogRef}>`
- `showModal()` on open, `close()` on close
- Style the dialog to match current mobile menu appearance (full-width below header)
- Add `aria-label="Mobile navigation"` to the dialog

### 2. Focus trap for subscribe modal

The subscribe modal already uses native `<dialog>` with `showModal()`, which **should** provide a focus trap by default. However, the current implementation may not be trapping focus correctly if the dialog styles override the default behavior.

**Verify:** Test whether focus actually stays within the dialog when Tabbing. If it does, this is already fixed. If not:

**Fix:** Ensure the dialog is rendered as a top-level element (not nested inside other positioned elements that might interfere). The native `<dialog>` `showModal()` method creates a focus trap automatically — if focus escapes, it's usually a CSS `position` or `z-index` issue.

**Note:** After testing, this may already work correctly. The native `<dialog>` with `showModal()` is the correct approach and should trap focus.

### 3. Add `aria-controls` to toggle buttons

Currently, the hamburger button and search toggle have `aria-expanded` but not `aria-controls`.

**Fix:**
```tsx
// Hamburger button
<button
  aria-expanded={menuOpen}
  aria-controls="mobile-nav-menu"  // ADD
  aria-label={menuOpen ? "Close menu" : "Open menu"}
>

// Mobile menu
<dialog id="mobile-nav-menu"> // ADD id

// Search button
<button
  aria-expanded={searchOpen}
  aria-controls="search-panel"  // ADD
>

// Search panel
<div id="search-panel"> // ADD id
```

### 4. Automated accessibility testing

Add `@axe-core/react` for development-time a11y warnings and `vitest-axe` for automated tests.

**Development overlay (`@axe-core/react`):**

In `client/src/main.tsx` (dev only):
```tsx
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000)
  })
}
```

This logs a11y violations to the browser console during development.

**Automated tests (`vitest-axe`):**

Add a test that renders key pages and checks for violations:
```tsx
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

it('StoryPage has no a11y violations', async () => {
  const { container } = render(<StoryPage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

Add tests for: HomePage, StoryPage, IssuePage, SearchPage.

## Files to Modify

| File | Action |
|------|--------|
| `client/src/layouts/PublicLayout.tsx` | Convert mobile menu to `<dialog>`, add `aria-controls` |
| `client/src/components/SubscribeModal.tsx` | Verify focus trap works (may need no changes) |
| `client/src/main.tsx` | Add axe-core dev overlay |
| `client/src/test/a11y.test.tsx` | Create — automated a11y tests |
| `package.json` (client) | Add `@axe-core/react` (dev), `vitest-axe` (dev) |

## Estimated Scope

Small — targeted fixes to 2-3 files + test setup. ~100 lines of code changes + ~80 lines of tests.
