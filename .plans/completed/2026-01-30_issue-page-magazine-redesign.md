# Visual Identity Enhancements

Make the site look like a designed magazine despite having no article images. Four changes: typography-driven hierarchy, decorative typographic elements, varied section layouts, and editorial furniture.

## 1. Typography-driven visual hierarchy

**Goal**: Make the featured card dramatically different from compact cards.

### StoryCard `featured` variant changes (`client/src/components/StoryCard.tsx`)
- Title size: `text-xl md:text-2xl` → `text-2xl md:text-3xl`
- When the story has a `quote`, show it as the primary visual element: a large italic blockquote with a giant decorative open-quote character (`"`) in the category color at ~15% opacity, absolutely positioned behind the text (120px font-size, top-left)
- When no quote but has `summary`, show 2 lines of summary text
- Add more vertical padding (`p-6` → `p-8`)

### Hero section changes (`client/src/pages/HomePage.tsx`)
- Hero title: keep `text-3xl md:text-5xl` but add Nexa font explicitly via `font-nexa` class for extra weight
- The hero pull quote gets the same giant decorative quote mark treatment

### CSS additions (`client/src/index.css`)
- New `.decorative-quote` utility: positions a giant `"` character as a pseudo-element behind pull quotes

## 2. Decorative typographic elements — numbered ranking badges

**Goal**: Give the homepage top stories a "top picks" feel.

### Homepage only, by recency (`client/src/pages/HomePage.tsx`)
- The hero story gets a `#1` badge — a small circled number in the top-left corner of the hero section
- The first featured story in the first issue section gets `#2`, the next gets `#3`
- Badge style: `w-8 h-8 rounded-full bg-neutral-900 text-white text-sm font-bold flex items-center justify-center` — small, clean, editorial
- Only show on homepage, not on issue pages

### Implementation
- Pass a `rank` prop to `HeroSection` and to the first `IssueSection`
- `HeroSection` renders badge with rank 1
- First `IssueSection`'s featured card gets rank 2, second section's featured gets rank 3
- `StoryCard` gets optional `rank?: number` prop — renders badge in top-right corner of featured variant

## 3. Three rotating section layouts

**Goal**: Break the visual monotony of identical issue sections on the homepage.

### Layout A: Current 2+3 grid (featured left, compacts right)
```
[  Featured (2 cols)  ] [ Compact ]
                        [ Compact ]
                        [ Compact ]
```

### Layout B: Full-width headline card + compact row below
```
[ Full-width featured card with quote/summary inline ]
[ Compact ] [ Compact ] [ Compact ]
```
- Featured card spans full width, displayed as a horizontal layout (title left, quote/summary right)
- Below: 3 compact cards in a row

### Layout C: Three equal columns
```
[ Card 1 ] [ Card 2 ] [ Card 3 ]
[ Card 4 (compact) ]
```
- First 3 stories as equal-sized featured-style cards (but smaller, `text-lg`)
- Remaining as compact below

### Implementation (`client/src/pages/HomePage.tsx`)
- Add `layoutVariant` prop to `IssueSection`: `'A' | 'B' | 'C'`
- Cycle through layouts: section 0 → A, section 1 → B, section 2 → C, section 3 → A, etc.
- Each layout is a different JSX block inside `IssueSection`

### New StoryCard variant (`client/src/components/StoryCard.tsx`)
- Add `variant: 'horizontal'` for Layout B's full-width card: flexbox row with title/meta on left, quote on right, category color left border (thick, 6px)

## 4. Editorial furniture — ruled section labels & standalone pull quotes

**Goal**: Fill the space between sections with magazine-style decorative elements.

### Ruled section labels (`client/src/index.css`)
- Replace the current section heading in `IssueSection` with a ruled label:
  ```
  ──────── HUMAN DEVELOPMENT ────────
  ```
- CSS: flex container with two `flex-1` pseudo-lines (`border-top`) flanking the text
- New `.ruled-heading` utility class

### Standalone pull quotes between sections (`client/src/pages/HomePage.tsx`)
- Between every other section divider, extract a quote from one of the stories in the preceding section
- Display as a large centered italic quote with the decorative quote mark, the story title as attribution below
- Links to the story
- Only show if a story in that section has a `quote` field

### Replace diamond dividers
- The `◆` diamond divider between sections gets replaced by ruled section labels (which serve as both divider and heading)
- Between sections that show a standalone pull quote, the pull quote itself acts as the divider

## Files to modify

| File | Changes |
|------|---------|
| `client/src/index.css` | Add `.decorative-quote`, `.ruled-heading` utilities |
| `client/src/components/StoryCard.tsx` | Larger featured title, decorative quote marks, optional `rank` badge, new `horizontal` variant |
| `client/src/pages/HomePage.tsx` | Ranking badges on hero + first sections, rotating layouts A/B/C, standalone pull quotes between sections, ruled section headings |
| `client/src/lib/category-colors.ts` | Add `borderThick` class (e.g. `border-l-[6px] border-amber-400`) for horizontal variant |

## Verification

1. `npm run build --prefix client` — no errors
2. Visual check on desktop and mobile:
   - Hero has `#1` badge, first two section featured stories have `#2` and `#3`
   - Sections rotate through 3 layouts
   - Ruled headings replace plain headings
   - Standalone pull quotes appear between some sections
   - Featured cards have large decorative quote marks
3. Check accessibility: badges have aria-label, decorative elements have aria-hidden
