# Social Sharing Buttons on Story Pages

## Goal

Add share buttons to story pages so readers can easily share stories on social media and via other channels.

## Current State

- Story pages (`client/src/pages/StoryPage.tsx`) have no sharing functionality
- The `marketingBlurb` field exists on stories — perfect for pre-filled share text
- Full story URL is already constructed: `${SEO.siteUrl}/stories/${story.slug}`
- No existing share or social components anywhere in the codebase

## Implementation

### 1. Create `ShareButtons` component

**File:** `client/src/components/ShareButtons.tsx`

A horizontal row of icon buttons for sharing. Channels:

| Channel | URL Pattern | Pre-fill |
|---------|-------------|----------|
| X / Twitter | `https://x.com/intent/tweet?url=...&text=...` | `marketingBlurb` or title |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` | URL only (LinkedIn scrapes OG tags) |
| Email | `mailto:?subject=...&body=...` | Title as subject, blurb + URL as body |
| Copy link | `navigator.clipboard.writeText(url)` | Show "Copied!" toast/tooltip |

Props:
```tsx
interface ShareButtonsProps {
  url: string
  title: string       // display title (titleLabel + title)
  description: string // marketingBlurb or summary fallback
}
```

### 2. Design

- Row of circular/rounded icon buttons, neutral gray by default, brand hover
- Small label "Share" to the left (or sr-only)
- Icons: inline SVGs (no icon library dependency)
- Match existing patterns: `focus-visible:ring-2 focus-visible:ring-brand-500`
- Touch target: minimum 24x24px (WCAG)
- "Copy link" shows brief tooltip/inline confirmation ("Copied!") via local state + timeout

### 3. Placement in StoryPage

After the metadata row (date, source, "Read original article"), before the summary section. This is the most prominent position and doesn't interrupt reading flow.

```tsx
{/* After metadata, before summary */}
<ShareButtons
  url={`${SEO.siteUrl}/stories/${story.slug}`}
  title={displayTitle}
  description={story.marketingBlurb || story.summary || displayTitle}
/>
```

### 4. Accessibility

- Each button gets `aria-label` (e.g., "Share on X", "Share via email", "Copy link")
- Icons get `aria-hidden="true"`
- "Copy link" announces success to screen readers via `role="status"` on the confirmation text
- All buttons have visible focus rings

### 5. Mobile behavior

- Optionally detect `navigator.share` (Web Share API) and show a single "Share" button on mobile that opens the native share sheet
- Fall back to individual buttons if Web Share API unavailable
- Individual buttons still work on mobile — they open the respective app or browser tab

## Files to Create/Modify

| File | Action |
|------|--------|
| `client/src/components/ShareButtons.tsx` | Create |
| `client/src/pages/StoryPage.tsx` | Add ShareButtons after metadata |

## Estimated Scope

Small — 1 new component + 1 integration point. ~100 lines of code.
