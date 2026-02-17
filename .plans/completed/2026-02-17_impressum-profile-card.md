# Add Profile Card and Support Button to Impressum Page

## Goal

Add a profile section to the Impressum (Legal Notice) page with:
- Profile image (same as About page)
- Website and LinkedIn links
- Support (Ko-fi) button

## Current State

- **About page** (`AboutPage.tsx`): Has an inline floated profile card (avatar, name, "AI Tinkerer", Website + LinkedIn links) and a centered support button below the prose.
- **Impressum page** (`ImprintPage.tsx`): Legal-only content — address, email, editorial responsibility, privacy link. No profile card or support button.

## Plan

1. **Extract a shared `ProfileCard` component** from the About page's inline profile card JSX. Both pages will use the same component, avoiding duplication of ~35 lines of SVG icons and link markup.

2. **Extract `HeartIcon` + support button** into a shared `SupportButton` component (or just move `HeartIcon` to shared and keep the button inline — TBD based on user preference).

3. **Add to Impressum page**: Place the profile card and support button after the privacy policy paragraph, separated by an `<hr>`. The card won't be floated (no surrounding prose to float against) — it'll be centered or left-aligned as a standalone section.

## Decisions

- **Shared components**: Extract `ProfileCard` and `SupportButton` to avoid duplicating ~70 lines.
- **Layout**: Float right within the prose div, same as About page. Place before the first `<h2>` so it sits alongside the legal text.

## Files to Change

- `client/src/components/ProfileCard.tsx` — **new** shared component
- `client/src/components/SupportButton.tsx` — **new** shared component
- `client/src/pages/ImprintPage.tsx` — add profile card + support button
- `client/src/pages/AboutPage.tsx` — refactor to use shared components
