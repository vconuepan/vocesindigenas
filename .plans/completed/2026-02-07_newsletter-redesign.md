# Newsletter Redesign — Better Structure, Support Link, Editorial Intro

**Status:** Completed
**Created:** 2025-02-07

## Goal

Improve the newsletter email template with better content structure, visual hierarchy, and missing elements. Specifically:

1. Add issue/category section headers between story groups
2. Show only `marketingBlurb` (not `summary`) per story
3. Add an LLM-generated editorial intro at the top
4. Add "Support Us" (Ko-fi) section before the footer
5. Add unsubscribe link at the bottom
6. Add brief context line (story count + date)

## Current State

- Newsletter HTML is generated in `server/src/services/newsletter.ts` (`generateHtmlContent()`)
- Markdown content is generated in `generateContent()` (template-based, no LLM)
- Stories sorted by issue but **no section headers** between groups
- Both `marketingBlurb` and `summary` shown — redundant
- Footer only has tagline + website link — no Support Us, no unsubscribe
- No editorial intro

## Changes

### 1. Markdown Content Generation (`generateContent`)

**Before:**
```markdown
## Story Title
**Category** | Publisher

Marketing blurb paragraph

Summary paragraph

**Why it matters:** Relevance reasons

[Read original](url)

---
```

**After:**
```markdown
{LLM-generated editorial intro}

---

# Climate & Environment

## Story Title
[Publisher](url) | [Read original article](url)

Relevance summary text (2/3 of stories)

---

## Story Title 2
[Publisher](url) | [Read original article](url)

> "A key quote from the article."
> — Speaker Name, Title

---
```

**Note:** Implementation diverged from initial plan:
- Uses `relevanceSummary` (2/3) and `quote`+`quoteAttribution` (1/3) instead of `marketingBlurb`
- Removed "Why it matters" section entirely
- Publisher is linked to source URL, with "Read original article" on same line
- Footer uses "Curated and written with care by AI." instead of "AI-curated news that matters."

Changes:
- Add LLM-generated intro at the top (separated by `---`)
- Add `# IssueName` headers when the issue group changes
- Remove `summary` — only show `marketingBlurb`
- Keep `Why it matters` and `Read original` link

### 2. LLM Editorial Intro Generation

Add a new step in `generateContent()` that calls an LLM to generate a 2-3 sentence editorial intro.

**New prompt file:** `server/src/prompts/newsletter-intro.ts`

The prompt receives the list of selected stories (titles, categories, blurbs) and generates a brief, engaging introduction. No separate API endpoint needed — the intro is generated as part of `generateContent()`.

**Prompt options** (to be decided — see Decision 1 below):

- **Option A — Warm & Contextual:** "Write a 2-3 sentence opening that weaves together the key themes from this edition's stories. Be warm and conversational, like a thoughtful friend sharing what caught their eye this week."
- **Option B — Crisp & Direct:** "Write a 1-2 sentence opening that names the dominant themes and sets expectations. Be clear and concise — readers should immediately know what this edition covers."
- **Option C — Curious & Forward-Looking:** "Write a 2-3 sentence opening that frames the stories as signals of where things are headed. Spark curiosity without clickbait — make the reader want to keep scrolling."

### 3. HTML Template Changes (`generateHtmlContent`)

#### 3a. Intro Section
After the header, before stories — render the intro text in a distinct styled block (slightly larger font, subtle left border or italic).

#### 3b. Issue Section Headers
When parsing the markdown, detect `# IssueName` lines and render them as styled section dividers:
```html
<tr>
  <td style="padding: 28px 0 8px;">
    <h3 style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #2563eb;">
      Climate & Environment
    </h3>
  </td>
</tr>
```

#### 3c. Story Blocks
- Remove summary paragraph rendering
- Keep: title (linked), category | publisher meta, blurb, "Why it matters", "Read more" link

#### 3d. Support Us Section
Before the footer, add a centered section:
```html
<tr>
  <td style="padding: 28px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
    <p style="margin: 0 0 12px; font-size: 14px; color: #525252;">
      Free. Independent. Without ads. Help us keep it that way.
    </p>
    <a href="https://ko-fi.com/odinmb" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #171717; border-radius: 8px; text-decoration: none;">
      &#10084; Support Us
    </a>
  </td>
</tr>
```

#### 3e. Unsubscribe Link
Plunk provides `{{plunk_id}}` template variable auto-replaced per recipient. Add to footer:
```html
<a href="https://app.useplunk.com/unsubscribe/{{plunk_id}}" style="color: #737373; text-decoration: underline;">Unsubscribe</a>
```

### 4. Files to Modify

| File | Change |
|------|--------|
| `server/src/services/newsletter.ts` | Update `generateContent()` and `generateHtmlContent()` |
| `server/src/prompts/newsletter-intro.ts` | **New file** — editorial intro prompt |
| `server/src/prompts/index.ts` | Export new prompt builder |
| `server/src/schemas/llm.ts` | Add `newsletterIntroResultSchema` |

### 5. No Database Migration Needed

The intro text is embedded directly in the `content` markdown field (at the top, before stories). No new Prisma field required.

## Decisions (Resolved)

### Decision 1: Editorial Intro Tone → **A — Warm & Contextual**
2-3 sentences weaving key themes, warm and conversational, like a thoughtful friend sharing what caught their eye.

### Decision 2: Story Meta Line → **Publisher only**
Section headers provide the category, so each story just shows the publisher name. Cleaner look, less redundancy.

### Decision 3: Intro placement → **Inline in `generateContent()`**
Generated as part of `generateContent()`, prepended to the markdown. No separate endpoint needed.

## Testing

- Unit tests for markdown → HTML parsing (issue headers, intro section, support block, unsubscribe link)
- Unit test for `generateContent()` output format (issue headers, no summary, intro placeholder)
- Mock LLM call for intro generation test

## Out of Scope

- Carousel image changes
- Newsletter selection prompt changes
- New database fields or migrations
