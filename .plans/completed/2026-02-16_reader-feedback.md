# Reader Feedback

Site-level feedback form for anonymous readers, protected by honeypot + aggressive rate limiting, visible only in the admin dashboard.

## Design Decisions

- **Scope**: Site-level (not per-story). General feedback about AR.
- **Access**: Anonymous — no account or email required.
- **Spam protection**: Honeypot field + aggressive rate limiting (3/hour per IP). No CAPTCHA for now — add Turnstile later if spam becomes a problem.
- **Categories**: General feedback, Bug report, Suggestion, Other.
- **Visibility**: Private to admin only. Not shown on public pages.
- **Notifications**: Admin dashboard page with unread badge in sidebar. No email.
- **Form placement**: Footer link opens a modal. Encapsulated `<FeedbackModal>` component so the trigger can be placed anywhere.

## Database

### New model: `Feedback`

```prisma
enum FeedbackCategory {
  general
  bug
  suggestion
  other
}

enum FeedbackStatus {
  unread
  read
  archived
}

model Feedback {
  id        String           @id @default(uuid())
  category  FeedbackCategory
  message   String
  email     String?          // optional, if reader wants a response
  status    FeedbackStatus   @default(unread)
  ipHash    String           @map("ip_hash")  // SHA-256 of IP, for rate-limit auditing (not raw IP)
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  @@map("feedback")
}
```

**Migration**: Hand-written SQL for the user to run in pgAdmin, per project conventions.

## Server

### Config (`server/src/config.ts`)

```typescript
feedback: {
  rateLimitWindowMs: parseInt(process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS || String(60 * 60 * 1000), 10), // 1 hour
  rateLimitMax: parseInt(process.env.FEEDBACK_RATE_LIMIT_MAX || '3', 10), // 3 per hour per IP
  messageMaxLength: 2000,
}
```

### Public endpoint: `POST /api/feedback`

File: `server/src/routes/public/feedback.ts`

- Zod schema: `{ category, message (max 2000 chars), email? (valid email format), honeypot? }`
- Custom rate limiter: 3 submissions per hour per IP
- Silently reject if honeypot field is filled (return success to not tip off bots)
- Hash IP with SHA-256 before storing (privacy)
- Return `{ success: true }` on success, generic error on failure (don't leak validation details to bots)
- Register in `server/src/routes/public/index.ts`
- No OpenAPI registration (internal form endpoint, not a public API)

### Admin endpoints: `server/src/routes/admin/feedback.ts`

- `GET /api/admin/feedback` — List feedback with filters (status, category, date range), pagination. Returns unread count in response.
- `GET /api/admin/feedback/count` — Just the unread count (for sidebar badge polling).
- `PATCH /api/admin/feedback/:id` — Update status (read/archived).
- `DELETE /api/admin/feedback/:id` — Hard delete.
- `POST /api/admin/feedback/bulk` — Bulk status update or delete (select multiple, mark all read, etc.).
- Register in `server/src/routes/admin/index.ts`

## Client

### FeedbackModal component: `client/src/components/FeedbackModal.tsx`

Follows the `SubscribeModal` pattern (native `<dialog>`, controlled via `open`/`onClose` props).

**Form fields:**
1. Category — radio buttons or segmented control (General feedback / Bug report / Suggestion / Other)
2. Message — textarea, required, max 2000 chars, character counter
3. Email — optional text input ("Leave your email if you'd like a response")
4. Honeypot — hidden field (`aria-hidden`, `tabIndex={-1}`, `autocomplete="off"`)

**States:** idle → loading → success → error

**Success view:** "Thanks for your feedback!" with a Done button (same pattern as SubscribeModal).

### Footer integration: `client/src/layouts/PublicLayout.tsx`

Add a "Feedback" link in the footer's Connect column that opens the `FeedbackModal`. The modal is rendered once at the layout level and controlled via state.

### Admin page: `client/src/pages/admin/FeedbackPage.tsx`

- Table view: category (badge), message (truncated), email, status, date
- Filters: status dropdown (all/unread/read/archived), category dropdown
- Bulk actions: mark as read, archive, delete (with confirmation)
- Click row to expand full message
- URL-persisted filters via `useSearchParams()`
- TanStack Query for data fetching

### Admin sidebar: `client/src/layouts/AdminLayout.tsx`

- Add "Feedback" nav item with `ChatBubbleLeftEllipsisIcon`
- Unread badge: small colored dot or count next to "Feedback" text
- Poll unread count via `GET /api/admin/feedback/count` (TanStack Query with 60s refetch interval)

### Client API: `client/src/lib/api.ts`

Add `submitFeedback()` to `publicApi` and feedback CRUD methods to `adminApi`.

## Implementation Order

1. **Database**: Write migration SQL, add model to Prisma schema
2. **Server config**: Add `feedback` config entry
3. **Public route**: `POST /api/feedback` with validation, rate limiting, honeypot check
4. **Admin routes**: CRUD endpoints for feedback management
5. **Client API**: Add feedback methods to `publicApi` and `adminApi`
6. **FeedbackModal**: Build the modal component
7. **Footer link**: Wire up the modal trigger in `PublicLayout`
8. **Admin page**: Build feedback management page
9. **Admin sidebar**: Add nav item with unread badge
10. **Tests**: Unit tests for route handlers and components

## Out of Scope

- CAPTCHA (Cloudflare Turnstile) — add later if spam becomes a problem
- Email notifications for new feedback
- Public display of feedback on story pages
- Feedback analytics/trends
- Auto-reply to feedback with email
- AI-powered spam detection
