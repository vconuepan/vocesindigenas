# Bug: Diagonal Line of Dashes Through Footer

## Symptom

A diagonal line made of small dots/dashes runs visually through the footer area of the homepage. The user sees it in Chrome on normal browsing. It was likely introduced when a large feature branch was merged into main.

## Root Cause Identification (Partial)

Through binary-search DOM hiding in Playwright DevTools, the **Science & Technology section's featured StoryCard** was identified as the primary source. Specifically:

1. Hiding the entire Science & Technology `<section>` eliminates the line
2. Within that section, hiding the **featured StoryCard `<article>`** (Layout A, left column, `md:col-span-2`) eliminates the line
3. Within that article, hiding the **`<ScienceTechnologyPattern>` SVG** (child 1, absolutely-positioned) eliminates the line
4. The article has `overflow-hidden` but the SVG pixels visibly escape it

The `ScienceTechnologyPattern` renders a dot grid (circles at 60px intervals across an 800x400 viewBox) plus circuit-path lines. These dots are what form the diagonal line.

**However**: the attempted fixes (see below) did not resolve the issue for the user, even though they appeared clean in Playwright screenshots. This means either:
- The SVG pattern is NOT the sole cause (something else also contributes)
- Playwright's rendering differs from Chrome's native rendering
- There's an interaction effect between multiple elements on the page
- The fix didn't properly propagate (Vite HMR / caching issue)

## What Was Tried

### 1. CSS Clipping Approaches (all failed in DevTools)

These were tested via Playwright `evaluate()` by injecting styles at runtime:

| Approach | Applied To | Result |
|---|---|---|
| `overflow: hidden` | SVG element itself | Line still visible |
| `will-change: transform` | Article element | Line still visible |
| `contain: paint` | Article element | Line still visible |
| `clip-path: inset(0 round 8px)` | Article element | Line still visible |
| SVG-internal `<clipPath>` element | Inside SVG | Line still visible |

None of these standard CSS clipping mechanisms stopped the pixel leak.

### 2. Expanded viewBox (appeared to work in Playwright, failed for user)

Changed `viewBox="0 0 800 400"` to `viewBox="-50 -50 900 500"` on all 5 pattern SVGs in `category-patterns.tsx`. The idea was to add padding so the SVG content doesn't reach the edges.

- **Playwright verification**: Looked clean in screenshots
- **User feedback**: "Still see the same as before even after a hard refresh"

Change was reverted.

### 3. `preserveAspectRatio="none"` (appeared to work in Playwright, failed for user)

Changed `preserveAspectRatio="xMidYMid slice"` to `preserveAspectRatio="none"` on all 5 pattern SVGs. The `slice` mode causes the SVG to overflow its viewport (like CSS `background-size: cover`), while `none` stretches to fill exactly.

- **Playwright verification**: Looked clean in screenshots
- **User feedback**: "I see the line clearly in the Playwright instance and in my normal browser"

Change was reverted.

## Key Evidence

### Confirmed via DOM binary search
- Hiding Science & Technology section -> line gone
- Hiding featured StoryCard article -> line gone
- Hiding SVG pattern (child 1 of article) -> line gone
- Hiding content div (child 2) alone -> line gone (height-dependent: article needs enough height for the leak to manifest)

### Confirmed with visual debugging
- Added red border to the featured article -> dots visible BELOW the border, proving pixels escape `overflow: hidden`
- Zoomed screenshot clearly showed indigo dots (the `#818cf8` color of ScienceTechnologyPattern) outside the article boundary

### SVG bounding box check
- `getBoundingClientRect()` on the SVG showed it was geometrically within the article bounds
- The overflow is a rendering-level artifact, not a layout-level overflow

## Files Involved

- **`client/src/lib/category-patterns.tsx`** — The 5 SVG pattern components. `ScienceTechnologyPattern` is the primary suspect. All use `preserveAspectRatio="xMidYMid slice"` and `viewBox="0 0 800 400"`.
- **`client/src/components/StoryCard.tsx`** — Featured variant wraps pattern in `overflow-hidden rounded-lg` article. Pattern rendered as `<Pattern opacity={0.12} />`.
- **`client/src/pages/HomePage.tsx`** — Science & Technology is the 4th section (idx=3), uses Layout A (2+3 grid). `IssueSection` wraps in `<section className="relative">` (no overflow-hidden at section level).
- **`client/src/index.css`** — `.story-card-hover` and other card styles.

## Potential Avenues Not Yet Explored

1. **Is it ONLY the ScienceTechnologyPattern?** The other 4 patterns also use `slice` mode but may not produce visible artifacts due to their shapes (arcs, waves, shards, scattered dots vs a regular grid).

2. **Check if the bug reproduces on other pages** — e.g., `/issues/science-technology` which also renders ScienceTechnologyPattern on StoryCards.

3. **Remove the pattern entirely** from ScienceTechnologyPattern (render empty SVG or null) to confirm it's truly the source in the user's browser, not just Playwright.

4. **Convert SVG to CSS `background-image`** using a data URI or a `<pattern>` element with `patternUnits="userSpaceOnUse"` — different rendering path may avoid the Chromium bug.

5. **Use a `<canvas>` or CSS-only pattern** instead of inline SVG for the dot grid.

6. **Check other SVGs on the page** — category illustrations (`getCategoryIllustration`), favicon SVGs, bookmark icon SVGs. The line might not be from the pattern at all.

7. **Check if the line appears with patterns completely removed** — temporarily return `null` from ALL pattern components to rule out patterns entirely.

8. **Viewport/zoom level sensitivity** — the leak may only appear at certain zoom levels or viewport widths. Test at 100%, 90%, 110%.

9. **Check the full-page screenshot more carefully** — the Playwright full-page screenshot is saved at `.playwright-mcp/full-page-bug-reference.png`. The user says the line IS visible in Playwright too, so look very carefully at the area between the Science & Technology section and the footer.

10. **Git bisect** — the user said the bug was introduced in a recent merge. Running `git bisect` between the merge commit and the previous known-good state could pinpoint the exact commit.
