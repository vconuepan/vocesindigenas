# /thank-you Credits Page

## Goal

Add a new static page at `/thank-you` that credits the people, projects, and services behind Actually Relevant.

## Content (in order)

1. **Logo** — "Logo by Erneste Design" (plain text, no link)
2. **Key libraries** — The most important open-source dependencies with links to their GitHub repos:
   - **Frontend:** React, Vite, Tailwind CSS, TanStack Query, React Router, Headless UI, Heroicons, react-helmet-async, react-markdown
   - **Backend:** Express, Prisma, LangChain, OpenAI (JS SDK), Zod, Pino, Cheerio, Mozilla Readability, node-cron, rss-parser, PDFKit, Axios
   - **Shared:** TypeScript, Vitest
   - **Social:** AT Protocol (Bluesky SDK), Masto (Mastodon SDK)
3. **ToolPilot** — "Listed on [ToolPilot.ai](https://www.toolpilot.ai)" (last item, with link)

## Implementation

### 1. Create `client/src/pages/ThankYouPage.tsx`

Follow the same pattern as `AboutPage.tsx` / `ImprintPage.tsx`:
- `react-helmet-async` for SEO meta tags
- `StructuredData` with WebPage schema + breadcrumbs
- `page-section` / `page-title` / `prose` CSS classes
- Group libraries by category (Frontend, Backend, Tooling, Social)
- Each library: name linked to its GitHub repo, one-line description of what it does for the project

### 2. Register route in `App.tsx`

- Lazy import `ThankYouPage`
- Add `<Route path="/thank-you">` inside the `PublicLayout` block

### 3. Add to `client/src/routes.ts`

- `{ path: '/thank-you', priority: 0.3, changefreq: 'yearly' }`

### 4. Add to `server/src/routes/public/sitemap.ts`

- Same entry in `STATIC_ROUTES`

### 5. Tests

- Add a test in `landing-pages.test.tsx` that renders the page and checks for the h1 heading

### 6. Build check

- `npm run build --prefix client` to verify no TS errors and prerendering works
