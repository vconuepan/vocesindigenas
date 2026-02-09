# Plunk Newsletter Integration [COMPLETED]

## Requirements

Integrate Plunk as the newsletter syndication service for Actually Relevant:

1. **Adjust newsletter generation** to produce HTML content that Plunk can consume as a campaign
2. **Two-tier sending**: test send to admin email(s), then live send to all subscribers — both via API
3. **Track delivery events** via campaign stats API and segment webhooks, record in database
4. **Admin UI tracking** to display send history, delivery stats, and campaign analytics
5. **Public subscription modal** triggered by "Subscribe" links (header, footer, etc.) that creates contacts in Plunk
6. **Double opt-in** implemented via Plunk workflow (track event → send confirmation email → confirm endpoint)

## Why Plunk Over EmailOctopus

| Capability | Plunk | EmailOctopus |
|------------|-------|--------------|
| Create campaigns via API | Yes (`POST /campaigns`) | No |
| Send campaigns via API | Yes (`POST /campaigns/:id/send`) | No |
| Test campaigns via API | Yes (`POST /campaigns/:id/test`) | No |
| Campaign stats via API | Yes (`GET /campaigns/:id/stats`) | Yes (read-only) |
| Manage contacts via API | Yes | Yes |
| Segments for targeting | Yes (dynamic, auto-updating) | Yes (lists) |
| Webhooks | Yes (via workflows + segments) | Yes (limited to 2 endpoints) |
| Transactional emails | Yes (`POST /v1/send`) | No |
| Built-in double opt-in | No (build with workflows) | Yes (automatic) |
| Pricing | Free: 1,000 emails/mo, then $0.001/email | Free: 2,500 subscribers |

**Key advantage**: Plunk supports full programmatic campaign lifecycle — create, test, send, and track — entirely via API. No manual dashboard steps required.

**Trade-off**: Double opt-in must be implemented manually using Plunk's transactional email endpoint + a confirmation workflow. This is more work but gives us full control over the confirmation email design.

## Plunk API Reference Summary

### Authentication
- Base URL: `https://next-api.useplunk.com`
- Secret key (`sk_*`): Required for all endpoints except `/v1/track`
- Public key (`pk_*`): Only for `/v1/track` (client-side event tracking)
- Header: `Authorization: Bearer {key}`
- Rate limits: 1,000 requests/minute per project, 14 emails/second (AWS SES)

### Campaign Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /campaigns` | Create campaign (name, subject, body HTML, from, audienceType, segmentId) |
| `GET /campaigns` | List all campaigns |
| `GET /campaigns/:id` | Get campaign details |
| `PATCH /campaigns/:id` | Update campaign |
| `POST /campaigns/:id/send` | Send immediately or schedule (`scheduledFor` ISO 8601) |
| `POST /campaigns/:id/cancel` | Cancel scheduled campaign |
| `POST /campaigns/:id/test` | Send test email |
| `GET /campaigns/:id/stats` | Get analytics (opens, clicks, bounces) |

### Contact Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /contacts` | Create/update contact (email, subscribed, data) |
| `GET /contacts` | List contacts (paginated, cursor-based) |
| `GET /contacts/:id` | Get contact |
| `PATCH /contacts/:id` | Update contact |
| `DELETE /contacts/:id` | Delete contact |

### Transactional Email
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /v1/send` | Send transactional email (to, from, subject, body HTML, template, data, attachments) |

### Event Tracking
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /v1/track` | Track event for contact (creates contact if new). Works with public key. |

### Segments
- Dynamic groups based on contact data + events
- Auto-update as contact data changes
- "Track membership changes" option sends webhook events (`segment.[name].entry` / `segment.[name].exit`)
- Used as campaign audience via `audienceType: "SEGMENT"` + `segmentId`

### Webhooks (via Workflows)
Plunk doesn't have a standalone webhook configuration page. Instead, webhooks are sent through:
1. **Workflow steps**: A workflow triggered by an event can include a "Webhook" step that POSTs to a URL with event + contact data
2. **Segment membership tracking**: When enabled, fires events on segment entry/exit

### Key Campaign Fields
```typescript
// POST /campaigns request body
{
  name: string           // Internal campaign name
  subject: string        // Email subject line
  body: string           // HTML email content
  from: string           // Sender email (verified domain)
  fromName?: string      // Sender display name
  replyTo?: string       // Reply-to address
  audienceType: "ALL" | "SEGMENT" | "FILTERED"
  segmentId?: string     // Required if audienceType is SEGMENT
  audienceFilter?: object // Required if audienceType is FILTERED
}

// Campaign response
{
  id: string
  name: string
  subject: string
  type: "ALL" | "SEGMENT" | "FILTERED"
  status: "DRAFT" | string  // DRAFT on creation
  scheduledAt: string | null
}
```

### Contact Fields
```typescript
// POST /contacts request body
{
  email: string          // Required
  subscribed: boolean    // Required — global subscription status
  data?: {               // Custom fields
    firstName?: string
    [key: string]: string | number | boolean | Date
  }
}

// Reserved fields (auto-managed): email, createdAt, updatedAt, subscribed
// Special field: locale (ISO 639 code, overrides project locale)
```

## Design Decisions

1. **Send timing**: "Send to Subscribers" offers both "Send Now" and "Schedule for Later" with a date/time picker in the confirmation dialog.
2. **Confirmation email**: Branded HTML email matching the site design (logo, brand colors, styled CTA button).
3. **Newsletter email template**: Clean minimal style with brand fonts, colors, and subtle dividers between stories. Not heavy card-based, but not plain either.
4. **Auto-send**: Manual only. Publishing a newsletter is separate from emailing it. Admin must explicitly click send buttons.

## Implementation Plan

### Phase 1: Server Infrastructure & API Client

#### 1.1 Environment Variables & Config
Add to `server/.env.sample`:
```
PLUNK_SECRET_KEY=           # sk_* — server-side API key
PLUNK_PUBLIC_KEY=           # pk_* — client-side event tracking key (optional)
PLUNK_FROM_EMAIL=           # Verified sender email (e.g., newsletter@actuallyrelevant.com)
PLUNK_FROM_NAME=            # Sender display name (e.g., "Actually Relevant")
PLUNK_TEST_SEGMENT_ID=      # Segment ID for test recipients
PLUNK_WEBHOOK_SECRET=       # Secret for verifying workflow webhook payloads (custom, set by us)
```

Config section in `server/src/config.ts`:
```typescript
plunk: {
  secretKey: process.env.PLUNK_SECRET_KEY || '',
  publicKey: process.env.PLUNK_PUBLIC_KEY || '',
  fromEmail: process.env.PLUNK_FROM_EMAIL || '',
  fromName: process.env.PLUNK_FROM_NAME || 'Actually Relevant',
  testSegmentId: process.env.PLUNK_TEST_SEGMENT_ID || '',
  webhookSecret: process.env.PLUNK_WEBHOOK_SECRET || '',
  baseUrl: 'https://next-api.useplunk.com',
}
```

#### 1.2 Plunk API Client
Create `server/src/services/plunk.ts`:
- Axios-based client with Bearer auth (`sk_*`)
- All methods wrapped in `withRetry()` from `server/src/lib/retry.ts`
- Structured logging via `createLogger('plunk')`

**Campaign methods:**
- `createCampaign(opts)` — POST `/campaigns`
- `updateCampaign(id, opts)` — PATCH `/campaigns/:id`
- `sendCampaign(id, scheduledFor?)` — POST `/campaigns/:id/send`
- `testCampaign(id)` — POST `/campaigns/:id/test`
- `getCampaignStats(id)` — GET `/campaigns/:id/stats`
- `listCampaigns()` — GET `/campaigns`

**Contact methods:**
- `createContact(email, subscribed, data?)` — POST `/contacts`
- `updateContact(id, data)` — PATCH `/contacts/:id`
- `getContact(id)` — GET `/contacts/:id`
- `deleteContact(id)` — DELETE `/contacts/:id`
- `listContacts(cursor?, limit?)` — GET `/contacts`

**Transactional methods:**
- `sendTransactional(opts)` — POST `/v1/send` (for double opt-in confirmation emails)

**Event tracking:**
- `trackEvent(email, event, data?)` — POST `/v1/track`

#### 1.3 Database Schema Changes

```sql
-- Track newsletter sends (links our Newsletter to a Plunk campaign)
CREATE TABLE newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  plunk_campaign_id VARCHAR(255),     -- Plunk campaign ID
  is_test BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft: campaign created in Plunk, not yet sent
    -- scheduled: send scheduled for a future time
    -- sending: send triggered via API
    -- sent: confirmed sent
    -- failed: send failed
  html_content TEXT NOT NULL,         -- Snapshot of HTML at time of send
  stats JSONB DEFAULT '{}',           -- Cached stats from Plunk campaign stats API
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_sends_newsletter ON newsletter_sends(newsletter_id);
CREATE INDEX idx_newsletter_sends_plunk ON newsletter_sends(plunk_campaign_id);

-- Track email events from Plunk webhooks (workflow webhook steps)
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,     -- e.g., campaign.sent, campaign.opened, contact.subscribed
  contact_email VARCHAR(255),
  contact_id VARCHAR(255),
  campaign_id VARCHAR(255),
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_occurred ON email_events(occurred_at);
```

Add corresponding Prisma models.

#### 1.4 Newsletter HTML Generation
Extend `server/src/services/newsletter.ts` with `generateHtmlContent(newsletterId)`:
- Converts the existing Markdown content into a responsive HTML email template
- Inline CSS only (email clients strip `<style>` tags)
- Table-based layout for maximum email client compatibility
- Template structure:
  - Header: site logo/name, newsletter title
  - Story blocks: title (as H2), category + publisher line, marketing blurb, AI summary, "Why it matters" section, "Read original" CTA link
  - Footer: unsubscribe link, site URL, brief tagline
- Returns HTML string and also stores it in the newsletter record (new `htmlContent` field on Newsletter model, or stored only on `newsletter_sends`)

### Phase 2: Campaign Sending Flow

#### 2.1 Admin API Endpoints
Add to `server/src/routes/admin/newsletters.ts`:

**Generate HTML:**
`POST /api/admin/newsletters/:id/html`
- Calls `generateHtmlContent(id)`
- Returns `{ html: string }`

**Send Test:**
`POST /api/admin/newsletters/:id/send-test`
- Creates a Plunk campaign with `audienceType: "SEGMENT"` + `segmentId: config.plunk.testSegmentId`
- Calls `testCampaign(plunkCampaignId)` or `sendCampaign(plunkCampaignId)` to the test segment
- Creates a `newsletter_sends` record with `is_test: true`
- Returns the send record

**Send Live:**
`POST /api/admin/newsletters/:id/send-live`
- Request body: `{ scheduledFor?: string }` — ISO 8601 timestamp, or omit for immediate send
- Creates a Plunk campaign with `audienceType: "ALL"` (all subscribed contacts)
- Calls `sendCampaign(plunkCampaignId, scheduledFor)` — immediate or scheduled
- Creates a `newsletter_sends` record with `is_test: false`, status `sending` or `scheduled`
- Returns the send record

**Refresh Stats:**
`POST /api/admin/newsletters/:id/sends/:sendId/refresh-stats`
- Calls `getCampaignStats(plunkCampaignId)`
- Updates the `stats` JSONB field on the `newsletter_sends` record
- Returns updated stats

**List Sends:**
`GET /api/admin/newsletters/:id/sends`
- Returns all `newsletter_sends` for this newsletter, ordered by `created_at DESC`

#### 2.2 Test Segment Setup
In the Plunk dashboard (manual, one-time):
- Create a segment containing only admin email addresses (e.g., filtered by a custom `role: "admin"` data field or specific email addresses)
- Store the segment ID in `PLUNK_TEST_SEGMENT_ID`

Alternative: Use `POST /campaigns/:id/test` which sends to a specified email without needing a segment. This is simpler for testing. We'll use this for "Send Test" and reserve the segment approach for live sends.

**Revised approach:**
- **Test send**: Use `POST /campaigns/:id/test` (sends to specific email addresses — likely the logged-in admin's email)
- **Live send**: Create campaign with `audienceType: "ALL"`, then `POST /campaigns/:id/send`

### Phase 3: Public Subscription & Double Opt-In

#### 3.1 Double Opt-In Flow
Since Plunk doesn't have built-in double opt-in, we implement it:

1. **User submits email** on the public site
2. **Server creates contact** via `POST /contacts` with `subscribed: false` and `data: { pendingConfirmation: true, confirmToken: "<random-uuid>" }`
3. **Server sends confirmation email** via `POST /v1/send` — a transactional email with a confirmation link pointing to our server: `https://{domain}/api/subscribe/confirm?token=<token>&email=<email>`
4. **User clicks link** → our server endpoint:
   - Validates the token against the stored `confirmToken` in the contact's data
   - Updates the contact via `PATCH /contacts/:id` with `subscribed: true, data: { pendingConfirmation: false }`
   - Redirects to a "Subscription confirmed!" page on the frontend
5. If the contact already exists and is subscribed, the initial subscribe endpoint returns a generic success (no information leak)

**Database support**: We need a small `pending_subscriptions` table (or store tokens in Plunk contact data):

```sql
CREATE TABLE pending_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  plunk_contact_id VARCHAR(255),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_subs_token ON pending_subscriptions(token);
CREATE INDEX idx_pending_subs_email ON pending_subscriptions(email);
```

#### 3.2 Public API Endpoints
Create `server/src/routes/public/subscribe.ts`:

**Subscribe:**
`POST /api/subscribe`
- Request: `{ email: string }`
- Zod validation (valid email)
- Rate limiting: strict (3 requests/minute per IP)
- Creates Plunk contact (subscribed: false) + pending_subscriptions record
- Sends confirmation transactional email via Plunk
- Always returns `{ success: true, message: "Check your email to confirm" }` (even if already subscribed — no info leak)

**Confirm:**
`GET /api/subscribe/confirm?token=xxx&email=xxx`
- Validates token + email match + not expired (24h TTL)
- Updates Plunk contact to `subscribed: true`
- Sets `confirmed_at` on pending_subscriptions record
- Redirects to `{CLIENT_URL}/subscribed` (success page)

**Unsubscribe page (optional, Plunk may handle):**
Plunk includes an unsubscribe mechanism in campaign emails. We may not need a custom unsubscribe endpoint.

#### 3.3 Confirmation Email Template
Create a Plunk template (via API or dashboard) for the double opt-in email:
- Subject: "Confirm your subscription to Actually Relevant"
- Body: Brief welcome text, confirmation button/link, note that link expires in 24h
- Can also be sent inline via `POST /v1/send` with `body` HTML directly

#### 3.4 Subscription Modal Component
Create `client/src/components/SubscribeModal.tsx`:
- Modal dialog (using Headless UI `Dialog` since it's already an admin dependency — BUT this is a public component, so we should NOT import Headless UI here per bundle splitting rules)
- Instead: use a simple custom modal with Tailwind styling, or a native `<dialog>` element
- Triggered by clicking "Subscribe" links anywhere on the site
- Content: headline ("Stay informed"), one-line description, email input, submit button
- States: idle, loading, success ("Check your email to confirm"), error
- Accessibility: focus trap, aria-live for status, proper label, escape to close
- Close on backdrop click or Escape key

#### 3.5 Subscribe Link Integration
Update `PublicLayout.tsx`:
- Header "Subscribe" link → opens the modal (instead of navigating)
- Footer "Newsletter" link → opens the same modal
- Pass modal state via React context or simple state lifting

#### 3.6 Subscription Confirmed Page
Create `client/src/pages/SubscribedPage.tsx`:
- Simple success page: "You're subscribed!" with a brief message
- Link back to home page
- Add to routes (public, static import), add Helmet meta, add to sitemap

### Phase 4: Admin UI — Send & Tracking

#### 4.1 Newsletter Detail Page Enhancements
Add to `client/src/components/admin/NewsletterDetail.tsx`:

**HTML Generation section:**
- "Generate Email HTML" button → calls `POST /api/admin/newsletters/:id/html`
- HTML preview panel (rendered in a sandboxed iframe via `srcdoc`)
- Loading state with message while generating

**Send section:**
- "Send Test" button → calls `POST /api/admin/newsletters/:id/send-test`
  - Shows confirmation dialog: "Send test email to [admin email]?"
  - Shows success/error toast after
- "Send to Subscribers" button → opens a confirmation dialog with two options:
  - **"Send Now"** → calls `POST /api/admin/newsletters/:id/send-live` with no `scheduledFor`
  - **"Schedule for Later"** → shows a date/time picker, then calls the same endpoint with `scheduledFor`
  - Dialog warns: "This will send to all subscribers and cannot be undone."
  - Disabled until HTML has been generated
  - Shows success/error toast after

**Send History section:**
- Table listing all `newsletter_sends` for this newsletter
- Columns: Date, Test/Live badge, Status badge, Recipients (from stats), Opens, Clicks, Bounces, Actions
- "Refresh Stats" button per row → polls Plunk for latest stats
- Expandable row or link to detailed stats view

#### 4.2 Campaign Stats Display
When a send record has stats, show:
- Delivered count / total
- Open rate (percentage + count)
- Click rate (percentage + count)
- Bounce count
- Last updated timestamp
- "Refresh" button to re-fetch from Plunk API

#### 4.3 Email Events Log (Optional — Phase 4b)
If we set up Plunk workflow webhooks:
- New admin tab: `/admin/email-events`
- Table: timestamp, event type, contact email, campaign name
- Filterable by type, date range

### Phase 5: Webhook Integration (via Plunk Workflows)

#### 5.1 Workflow Webhook Endpoint
Create `server/src/routes/webhooks/plunk.ts`:
- `POST /api/webhooks/plunk` — public endpoint (no JWT auth)
- Verify webhook authenticity using a shared secret (custom header or payload field we configure in the Plunk workflow webhook step URL as a query param: `/api/webhooks/plunk?secret=xxx`)
- Parse payload (event + contact data from workflow)
- Insert into `email_events` table
- Return 200

#### 5.2 Plunk Workflow Setup (Manual, in Dashboard)
Create workflows triggered by key events:
1. **Newsletter opened** workflow: trigger on campaign open event → webhook step to our endpoint
2. **Newsletter clicked** workflow: trigger on campaign click event → webhook step
3. **Contact subscribed** workflow: trigger on subscription confirmation → webhook step
4. **Contact unsubscribed** workflow: trigger on unsubscribe → webhook step

Note: This phase is optional for MVP. Campaign stats via `GET /campaigns/:id/stats` provide opens/clicks/bounces without webhooks. Webhooks add real-time individual-level tracking.

### Phase 6: Setup & Configuration

#### 6.1 Plunk Account Setup (Manual — documented in context file)
1. Create Plunk account at useplunk.com
2. Verify sending domain (add DNS records: SPF, DKIM, DMARC)
3. Generate API keys (secret + public) in dashboard
4. Create a segment for test recipients (admin emails)
5. Optionally create workflows for webhook events
6. Add all env vars to `.env` and Render environment

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `server/src/services/plunk.ts` | Plunk API client (campaigns, contacts, transactional) |
| `server/src/services/plunk.test.ts` | API client tests |
| `server/src/routes/public/subscribe.ts` | Public subscribe + confirm endpoints |
| `server/src/routes/webhooks/plunk.ts` | Webhook receiver for Plunk workflow events |
| `client/src/components/SubscribeModal.tsx` | Public subscription modal component |
| `client/src/pages/SubscribedPage.tsx` | Subscription confirmed page |
| `.context/plunk.md` | Context documentation |

### Modified Files
| File | Changes |
|------|---------|
| `server/src/config.ts` | Add `plunk` config section |
| `server/.env.sample` | Add Plunk env vars |
| `server/prisma/schema.prisma` | Add `NewsletterSend`, `EmailEvent`, `PendingSubscription` models |
| `server/src/services/newsletter.ts` | Add `generateHtmlContent()` |
| `server/src/routes/admin/newsletters.ts` | Add HTML generation, send-test, send-live, refresh-stats, list-sends endpoints |
| `server/src/schemas/newsletter.ts` | Add Zod schemas for new endpoints |
| `server/src/app.ts` | Mount subscribe, webhook routes |
| `client/src/components/admin/NewsletterDetail.tsx` | Add HTML preview, send buttons, send history table, stats display |
| `client/src/hooks/useNewsletters.ts` | Add hooks for HTML gen, send, stats |
| `client/src/lib/admin-api.ts` | Add new admin API methods |
| `client/src/lib/api.ts` | Add public `subscribe()` method |
| `client/src/layouts/PublicLayout.tsx` | Subscribe links open modal instead of navigating |
| `client/src/App.tsx` | Add `/subscribed` route (static import for prerendering) |
| `client/src/routes.ts` | Add sitemap entry for `/subscribed` |
| `shared/types/index.ts` | Add `NewsletterSend`, `EmailEvent`, `PendingSubscription` types |
| `CLAUDE.md` | Add context file reference |

## Risks & Considerations

1. **Double opt-in is manual** — We must build the confirmation flow ourselves (token generation, transactional email, confirmation endpoint). More work than EmailOctopus's built-in flow, but gives us full control over the UX and email design.

2. **No native webhook system** — Plunk uses workflow steps for webhooks, which means we need to create workflows in the dashboard for each event type we want to track. For MVP, we can skip this and rely on the campaign stats API for aggregate metrics.

3. **Webhook verification** — Plunk workflow webhooks don't have built-in signature verification like EmailOctopus. We'll use a shared secret in the webhook URL query parameter as a simple auth mechanism.

4. **Rate limits** — 14 emails/second (AWS SES default). For large subscriber lists, Plunk queues campaigns in the background, so this is handled automatically.

5. **Plunk branding on free tier** — Free plan includes "Plunk-branded footer in all emails." Acceptable for MVP but may want to upgrade ($0.001/email) for production.

6. **HTML email compatibility** — Email clients vary wildly. Keep templates simple: inline CSS, table layout, limited CSS properties. Test with the test send feature before going live.

7. **Subscribe modal on public site** — Must NOT import Headless UI (admin-only package per bundle splitting rules). Use a custom modal with native `<dialog>` or Tailwind-only implementation.

8. **Token expiry cleanup** — `pending_subscriptions` table will accumulate expired/unconfirmed tokens. Add a periodic cleanup job (cron) to delete records older than 7 days.

## Implementation Order

**Phase 1** (Server infra) → **Phase 3** (Public subscription + double opt-in) → **Phase 2** (Campaign sending) → **Phase 4** (Admin UI) → **Phase 5** (Webhooks, optional) → **Phase 6** (Setup docs)

Rationale: Infrastructure first, then the public-facing subscription form (immediate user value), then the admin send workflow (builds on infra), then UI enhancements and optional webhook tracking.
