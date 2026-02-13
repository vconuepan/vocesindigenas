# Fix Mobile Hamburger Menu Layout

## Requirements

The mobile hamburger menu (`<dialog>`) in `PublicLayout.tsx` had two visual issues:

1. **Not full width** — The browser's default `<dialog>` UA stylesheet applies `max-width`, causing a gap on the right side.
2. **Poor layout** — The menu appeared below the header as a floating panel, partially overlapping content.

### Design decisions (user-confirmed):
- **Full top-overlay**: Menu starts at the very top of the viewport, with the logo as the first element inside
- **Auto height**: Panel covers only what it needs; darkened backdrop visible below
- **Close (X) button**: Top-right, same position as the hamburger
- **Color strip** below the logo + claim inside the overlay (added in follow-up)

## Changes Made

**File:** `client/src/layouts/PublicLayout.tsx`

### 1. Dialog sizing and overrides
- Added `w-full h-[100dvh] max-w-none max-h-none` to override UA stylesheet defaults (`w-full` not `w-[100vw]` to avoid scrollbar width mismatch)
- Added `overflow-hidden` to prevent UA scrollbar
- Added `backdrop:bg-transparent` to zero out native `::backdrop` (our own div handles the backdrop)
- Changed `open:flex flex-col` → `open:flex open:flex-col` for clarity
- Removed dead `onClick` handler on dialog (child elements cover all pixels)

### 2. Replaced spacer with logo + close button
- Removed the transparent spacer div
- Added a white header row with centered logo (same markup as main header) and X close button in top-right
- Added `border-b border-neutral-100` on the logo wrapper to match the main header's 1px border, ensuring the color strip aligns at the exact same y-position (no flicker on open)

### 3. Added tap-to-close backdrop
- Added a `flex-1 bg-black/40` div at the bottom of the dialog
- Covers remaining viewport below menu content with semi-transparent overlay
- Tapping it closes the menu

### 4. Nav content unchanged
- Mood dial, issue links, saved/subscribe/support remain as-is

### 5. DRY component extraction (follow-up)
- Extracted `BrandLogo` component — reused in main header and dialog header
- Extracted `CategoryColorStrip` component — reused in mobile header strip (`lg:hidden`), dialog header, and footer
- Added `<CategoryColorStrip />` below the logo in the dialog header

## Not Changed (intentional)
- The `::backdrop` on the native dialog is explicitly transparent since our own div handles the visual backdrop + click-to-close behavior.
