# Category Section Illustrations

## Goal

Replace the current minimal section dividers (`——— dot + name ———`) with redesigned dividers featuring hand-drawn-style SVG illustrations for each category. Single continuous stroke, fixed line weight, category-colored.

## Current State

- `RuledHeading` component in `client/src/pages/HomePage.tsx:80-101` renders a small color dot + name + "View all" with CSS ruled lines
- `.ruled-heading` CSS in `client/src/index.css:177-186` creates the `——— TITLE ———` appearance
- Category colors defined in `client/src/lib/category-colors.ts` (hex values available)
- Existing SVG patterns in `client/src/lib/category-patterns.tsx` (background fills, unrelated to this work)

## Design

### Layout (left illustration)

```
┌──────────────────────────────────────────────────┐
│  ┌──────┐                                        │
│  │ SVG  │  HUMAN DEVELOPMENT            View all │
│  │ illu │                                        │
│  └──────┘                                        │
└──────────────────────────────────────────────────┘
```

- SVG illustration ~64x64px on the left
- Category name: larger text (text-lg or text-xl, uppercase, bold, tracking-wide)
- "View all" link on the far right, vertically centered
- More vertical breathing room (py-4 or similar)
- Remove the ruled lines (::before/::after borders)

### Illustrations (single continuous stroke)

All SVGs: `viewBox="0 0 64 64"`, single `<path>` with `fill="none"`, `stroke={categoryHex}`, `strokeWidth="2.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`. One continuous line per illustration.

| Category | Symbol | Description |
|---|---|---|
| Human Development | Reaching figure | Person with arms raised upward, drawn in one flowing stroke |
| Planet & Climate | Leaf | Single leaf with stem and vein, one continuous line |
| Existential Threats | Shield | Shield/warning shape with inner mark, single stroke |
| Science & Technology | Beaker | Erlenmeyer flask with bubbles, one flowing line |
| General News | Compass | Compass rose or directional compass, single stroke |

## Implementation

### Step 1: Create illustration components

**File:** `client/src/lib/category-illustrations.tsx` (new file)

- Export 5 named components: `HumanDevelopmentIllustration`, `PlanetClimateIllustration`, etc.
- Each renders an inline SVG with a single `<path d="...">` element
- Accept props: `color: string` (hex), `className?: string`, `size?: number` (default 64)
- Export `getCategoryIllustration(slug)` lookup function (same pattern as `getCategoryPattern`)

### Step 2: Redesign `RuledHeading` component

**File:** `client/src/pages/HomePage.tsx` (modify `RuledHeading`, lines 80-101)

- Import `getCategoryIllustration` from the new file
- Render: flex row with illustration on left, name + view-all on right
- Larger category name (text-lg md:text-xl, uppercase, font-bold, tracking-wider)
- Color dot stays as a small accent next to the name (or remove if redundant with illustration)
- "View all" aligned right
- Add bottom margin/padding for breathing room

### Step 3: Update CSS

**File:** `client/src/index.css`

- Remove or update `.ruled-heading` styles (the `::before`/`::after` ruled lines)
- Add any needed styles for the new layout if Tailwind utilities aren't sufficient

## Files Modified

- `client/src/lib/category-illustrations.tsx` — **new** — 5 SVG illustration components
- `client/src/pages/HomePage.tsx` — modify `RuledHeading` component
- `client/src/index.css` — update/remove `.ruled-heading` styles

## Verification

1. Run `npm run build --prefix client` — no build errors
2. Run `npm run test --prefix client -- --run` — no test failures
3. Visual check: open local dev server, scroll through homepage, confirm all 5 sections show illustrations with correct colors and layout
4. Check responsive: illustrations should scale down gracefully on mobile
