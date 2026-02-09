# Batch Implementation Follow-up

## User Input Needed

### Plunk Newsletter Integration
- Need Plunk account credentials: `PLUNK_SECRET_KEY`, `PLUNK_PUBLIC_KEY`, `PLUNK_FROM_EMAIL`, `PLUNK_FROM_NAME`, `PLUNK_TEST_SEGMENT_ID`, `PLUNK_WEBHOOK_SECRET`
- Need to verify sending domain (DNS records: SPF, DKIM, DMARC) in Plunk dashboard
- Need to create a test segment in Plunk dashboard for admin email recipients
- Optionally set up Plunk workflows for webhook events (campaign opened, clicked, contact subscribed/unsubscribed)
- Need `CLIENT_URL` and `API_URL` env vars set for the double opt-in confirmation email link

## DB Migrations

### Plunk Newsletter Integration (from `plunk-newsletter-integration.md`)
Three new tables and one enum need to be created. Schema changes are in `server/prisma/schema.prisma` but migration SQL hasn't been generated yet.

**New enum:** `NewsletterSendStatus` (draft, scheduled, sending, sent, failed)

**New table: `newsletter_sends`**
- Tracks newsletter campaign sends linking to Plunk campaigns
- Has foreign key to `newsletters` table
- Stores HTML snapshot, stats JSON, error messages

**New table: `pending_subscriptions`**
- Stores double opt-in confirmation tokens
- Expires after configurable hours (default 24)

**New table: `email_events`**
- Stores webhook events from Plunk workflows
- Tracks opens, clicks, bounces, subscribes, unsubscribes

**Newsletter model updated:** Added `sends` relation to `NewsletterSend[]`

**After migration:**
1. Generate migration SQL: `npm run db:migrate --prefix server -- --create-only --name plunk_newsletter_integration`
2. Run the SQL in pgAdmin
3. Mark as applied: `npm run db:migrate:resolve --prefix server -- --applied <migration_name>`
4. Stop dev server, then run: `npm run db:generate --prefix server`
5. After `db:generate`, replace the `(prisma as any)` casts in:
   - `server/src/services/newsletter.ts` (5 occurrences of `(prisma as any).newsletterSend`)
   - `server/src/services/subscribe.ts` (4 occurrences of `(prisma as any).pendingSubscription`)
   - `server/src/routes/webhooks/plunk.ts` (1 occurrence of `(prisma as any).emailEvent`)
   Back to proper `prisma.newsletterSend`, `prisma.pendingSubscription`, `prisma.emailEvent`
6. Also update the `NewsletterSendStatus` type in `server/src/services/newsletter.ts` to import from `@prisma/client` instead of the local type alias

### Feed URL Rename & Display Title (from `feed-url-rename-and-display-title.md`)
Column rename and two new columns on the `feeds` table.

**Migration SQL:**
```sql
ALTER TABLE feeds RENAME COLUMN url TO rss_url;
ALTER TABLE feeds ADD COLUMN url TEXT;
ALTER TABLE feeds ADD COLUMN display_title TEXT;
```

**After migration:**
1. Generate migration SQL: `npm run db:migrate --prefix server -- --create-only --name feed_url_rename_display_title`
2. Run the SQL in pgAdmin
3. Mark as applied: `npm run db:migrate:resolve --prefix server -- --applied <migration_name>`
4. Stop dev server, then run: `npm run db:generate --prefix server`
5. After `db:generate`, clean up the temporary workarounds:
   - `server/src/services/feed.ts`: Remove `(prisma.feed as any)` casts in `createFeed` and `updateFeed`, and the field remapping logic (`rssUrl` → `url`). Replace with direct `prisma.feed.create({ data })` and `prisma.feed.update({ where: { id }, data })`.
   - `server/src/services/crawler.ts`: Change `feed.url` → `feed.rssUrl` (line ~34, remove the comment)
   - `server/src/services/favicon.ts`: In `fetchAllFavicons`, change `feed.url` → `feed.rssUrl` and pass `feed.url` (homepage) as `homeUrl` parameter. In `fetchFavicon`, the signature is already correct.
   - `server/src/routes/admin/feeds.ts`: Change `fetchFavicon(feed.id, feed.url, null, true)` → `fetchFavicon(feed.id, feed.rssUrl, feed.url, true)` (remove comment)
   - `server/src/services/story.ts`: Uncomment `displayTitle: true` in `PUBLIC_STORY_SELECT`

## Files to Delete

_(none)_

## Implementation Issues

### Plunk Newsletter Integration
- Used `(prisma as any)` casts for the 3 new Prisma models (`newsletterSend`, `pendingSubscription`, `emailEvent`) because the Prisma client cannot be regenerated without the DB migration being applied first. These must be cleaned up after running the migration and `db:generate` (see DB Migrations section above).
- The `SubscribeModal` uses the native `<dialog>` element to avoid importing Headless UI in the public bundle. The `backdrop:` Tailwind classes may not work in all browsers (Safari < 15.4). Worth testing.
- The confirmation email uses a hardcoded `API_URL` env var for the confirm link. Make sure this is set correctly in production.

### Feed URL Rename & Display Title
- The Prisma schema defines `rssUrl` mapped to `rss_url`, but the current generated client still uses `url`. Until the migration runs and `db:generate` is executed, the service layer maps `rssUrl` → `url` for Prisma calls and uses `(prisma.feed as any)` casts. See DB Migrations section above for cleanup steps.
- `displayTitle` is accepted by the API schema but won't be persisted until the migration adds the column. After migration + regenerate, it will work automatically.
- `PUBLIC_STORY_SELECT` has `displayTitle` commented out until the migration is applied. The public UI already renders `displayTitle || title` but the field will be `undefined` (falsy) until then, so it gracefully falls back to `title`.
