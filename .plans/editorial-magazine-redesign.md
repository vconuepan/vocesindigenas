# Editorial Magazine Redesign — Homepage + Story Page

## Requirements

Redesign the public homepage and story detail page using an **editorial magazine** approach:
- Bold typography, pull quotes, and geometric decorative elements to create visual rhythm
- No images (we can't use article images) — typography and CSS-only accents are the design tools
- Keep existing Nexa/Roboto fonts and pink brand logo unchanged
- No relevance ratings shown publicly (most are 5/10, the floor)
- Emotion tags stay hidden in this view (future emotion-based view will use them)
- Subtle per-category accent colors as a secondary tool (thin borders, small dots)
- Cross-category hero at top of homepage + styled per-category sections below
- Restyle the story detail page to match

## Design Decisions

### Category accent colors (subtle use only)
| Category | Color | Tailwind |
|---|---|---|
| Human Development | Amber | `amber-500` / `amber-50` |
| Planet & Climate | Teal | `teal-500` / `teal-50` |
| Existential Threats | Red | `red-500` / `red-50` |
| Science & Technology | Indigo | `indigo-500` / `indigo-50` |
| General News | Brand pink | `brand-500` / `brand-50` |

These colors appear as:
- Small colored dot or thin left border on section headings
- Thin top border on the hero story card (matching its category)
- Category label pill on story detail page

They do NOT appear as:
- Section background tints (keeps the editorial feel clean)
- Overwhelming color blocks

### Typography hierarchy (editorial feel)
- Hero story title: `text-4xl md:text-5xl` Nexa bold
- Hero pull quote: `text-xl md:text-2xl` Roboto italic, pink left border
- Section headings: `text-2xl` Nexa bold with small category-colored dot before the text
- Featured story title: `text-xl md:text-2xl` Nexa bold
- Compact story title: `text-lg` Nexa bold
- Source/date metadata: `text-sm` Roboto, muted

### Decorative elements (CSS-only)
- **Dot grid pattern**: Very low-opacity repeating radial gradient behind the hero section
- **Section dividers**: Thin horizontal rule with a small centered diamond in brand pink
- **Pull quote styling**: Large italic text, pink left border, light pink background
- **Card hover**: Subtle pink shadow (`shadow-lg` with brand-tinted color) instead of just border change
- **Tagline bar**: Thin `brand-50` strip below header with the site tagline in small italic text

## Implementation Plan

### Phase 1: Design system additions

**Files:** `client/tailwind.config.js`, `client/src/index.css`

1. Add category color map as a constant in a new file `client/src/lib/category-colors.ts`:
   - Maps issue slugs to Tailwind color classes (border, dot, bg)
   - Used by homepage sections and story detail page
2. Add CSS utility classes in `index.css`:
   - `.hero-section` — container for the hero area with dot-grid background
   - `.section-divider` — styled `<hr>` with centered diamond ornament
   - `.pull-quote` — large italic text with pink left border and light background
   - `.tagline-bar` — thin bar for the site tagline below header
3. No changes to `tailwind.config.js` needed — amber, teal, red, indigo are default Tailwind colors

### Phase 2: Homepage hero section

**Files:** `client/src/pages/HomePage.tsx`

1. Add a new API call or select from existing data: pick the single most recent published story across all issues as the hero
2. Build the hero section at the top of the page:
   - Full-width `brand-50` background with subtle dot-grid pattern
   - Category label (small uppercase text with colored dot)
   - Large title in Nexa bold (text-4xl/5xl)
   - Pull quote from the story (`story.quote`) in italic with pink left border
   - Summary text below
   - Source attribution and date
   - Link to full story
3. The hero story is excluded from its category section below (no duplicate)

### Phase 3: Homepage category sections

**Files:** `client/src/pages/HomePage.tsx`, `client/src/components/StoryCard.tsx`

1. Add section divider ornament between each category section
2. Restyle section headers:
   - Small category-colored dot before the issue name
   - "View all →" link stays
3. Restyle `StoryCard` featured variant:
   - Larger title (text-xl/2xl Nexa)
   - Show the pull quote (`story.quote`) if available, truncated, with pink left border styling
   - Better spacing and typography
4. Restyle `StoryCard` compact variant:
   - Thin category-colored left border
   - Tighter, more magazine-like layout
   - Source + date on one line, smaller
5. Alternating section layouts (stretch goal):
   - Odd sections: featured story left (2/3), compact cards right (1/3)
   - Even sections: reversed
   - This creates visual movement; if complex, start with a simpler uniform layout and iterate

### Phase 4: Tagline bar in header

**Files:** `client/src/layouts/PublicLayout.tsx`

1. Add a thin strip between the header and main content:
   - `brand-50` background
   - Small italic text: "AI-curated news that matters for humanity's future"
   - Centered, subtle, not attention-grabbing
2. Optional: thin multi-color line using category colors at the very bottom of the issues nav bar (only if it looks good, not forced)

### Phase 5: Story detail page

**Files:** `client/src/pages/StoryPage.tsx` (public)

1. Add a category label at the top:
   - Small uppercase text with category-colored dot
   - Links back to the issue page
2. Restyle the title: larger Nexa (text-4xl/5xl), generous letter-spacing
3. Restyle the metadata line: source, date, formatted cleanly
4. Restyle the quote section:
   - Large callout block with pink left border, light pink background
   - Centered or indented for emphasis
5. Restyle the "Why This Matters" / "Caveats" sections:
   - Better visual separation (section divider ornament)
   - Cleaner typography
6. Add a "Read original article" link styled as a subtle button
7. Add "More from [Issue Name]" section at the bottom (links to issue page)

### Phase 6: Polish and verify

1. Run `npm run build --prefix client` — zero errors
2. Run `npm run test --prefix client -- --run` — all tests pass
3. Visual check with Playwright screenshots of:
   - Homepage (desktop + mobile)
   - Story detail page (desktop + mobile)
   - Issue page (confirm it still looks acceptable even without restyling)
4. Verify accessibility: focus rings, contrast ratios, semantic HTML preserved

## Files Modified

| File | Change |
|---|---|
| `client/src/lib/category-colors.ts` | **New** — category color map |
| `client/src/index.css` | Add editorial CSS utilities |
| `client/src/pages/HomePage.tsx` | Hero section + restyled category sections |
| `client/src/components/StoryCard.tsx` | Editorial card styling |
| `client/src/layouts/PublicLayout.tsx` | Tagline bar |
| `client/src/pages/StoryPage.tsx` | Editorial story detail styling |
| `client/tailwind.config.js` | Possibly extend shadow colors (minor) |

## Risks

- **Hero story selection**: Picking the "top" story across categories requires either a new API endpoint or client-side selection from existing data. Client-side is simpler (pick the first story from the first non-empty issue).
- **Alternating layouts**: The odd/even section layout adds complexity. Start with a uniform layout and add alternation if it looks good.
- **Quote availability**: Not all stories may have a `quote` field populated. The pull quote elements must gracefully hide when no quote exists.
- **Mobile responsiveness**: The editorial layout (large text, pull quotes, alternating layouts) must degrade well on mobile. Will test with Playwright at mobile viewport.

## Out of Scope

- Emotion-based view (future feature)
- Issue page restyling (separate pass)
- About/Methodology/Contact pages (separate pass)
- New API endpoints (use existing data)
