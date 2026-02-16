# Plan: Add `/newsletter` static page

## Goal

Add a `/newsletter` route with an inline newsletter registration form. Reuse the form logic from `SubscribeModal` to stay DRY.

## Current state

- `SubscribeModal.tsx` — dialog component containing the subscribe form (first name + email), submission logic, success/error states
- `SubscribeProvider.tsx` — context that opens/closes the modal via `openSubscribe()`
- `LandingCta` — used on landing pages, opens the modal via `openSubscribe()`
- No standalone page for newsletter subscription exists

## Approach

### 1. Extract `SubscribeForm` from `SubscribeModal`

Create `client/src/components/SubscribeForm.tsx` containing:
- The form fields (first name, email), submit handler, loading/error/success states
- All API interaction logic (`publicApi.subscribe`)
- Accept optional props: `onSuccess?: () => void` (so the modal can close after success)
- Success view (check-your-email confirmation) rendered inline

`SubscribeModal` becomes a thin wrapper: dialog chrome + `<SubscribeForm />`.

### 2. Create `NewsletterPage.tsx`

Standard landing page following existing patterns (Helmet + OG tags + breadcrumb schema + StructuredData):
- Hero section with heading, description, and the `<SubscribeForm />` rendered inline (not in a modal)
- Brief value proposition below (e.g., "what you get" bullets: weekly digest, no spam, curated by AI)
- Uses `page-section` layout classes

### 3. Register the route

- `routes.ts` — add `{ path: '/newsletter', priority: 0.7, changefreq: 'monthly' }`
- `App.tsx` — lazy-load `NewsletterPage` inside `PublicLayout`

### 4. Update footer/header links

Currently "Newsletter" in the footer opens the modal via `openSubscribe()`. Change it to a `<Link to="/newsletter">` instead, so the dedicated page is discoverable. The header "Subscribe" button can stay as-is (opens modal for quick access).

## Files changed

| File | Change |
|------|--------|
| `client/src/components/SubscribeForm.tsx` | **New** — extracted form logic |
| `client/src/components/SubscribeModal.tsx` | Refactor to use `<SubscribeForm />` |
| `client/src/pages/NewsletterPage.tsx` | **New** — `/newsletter` page |
| `client/src/App.tsx` | Add lazy import + route |
| `client/src/routes.ts` | Add route config |
| `client/src/layouts/PublicLayout.tsx` | Footer "Newsletter" link → `<Link to="/newsletter">` |

## Decisions

- **Footer link**: "Newsletter" navigates to `/newsletter` (not modal)
- **Page content**: Minimal — form + short tagline, no full landing page treatment
- **Header Subscribe button**: Stays as modal for quick access

## Out of scope

- Newsletter archive/past-issues page
