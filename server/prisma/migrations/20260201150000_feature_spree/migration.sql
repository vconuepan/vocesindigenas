-- Feed URL rename: existing data in "url" carries over to "rss_url"
ALTER TABLE "feeds" RENAME COLUMN "url" TO "rss_url";
ALTER TABLE "feeds" ADD COLUMN "url" TEXT;
ALTER TABLE "feeds" ADD COLUMN "display_title" TEXT;

-- Plunk newsletter integration
CREATE TYPE "NewsletterSendStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

CREATE TABLE "newsletter_sends" (
    "id" TEXT NOT NULL,
    "newsletter_id" TEXT NOT NULL,
    "plunk_campaign_id" TEXT,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "status" "NewsletterSendStatus" NOT NULL DEFAULT 'draft',
    "html_content" TEXT NOT NULL DEFAULT '',
    "stats" JSONB,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pending_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "plunk_contact_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_id" TEXT,
    "campaign_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "newsletter_sends_newsletter_id_idx" ON "newsletter_sends"("newsletter_id");
CREATE INDEX "pending_subscriptions_email_idx" ON "pending_subscriptions"("email");
CREATE INDEX "pending_subscriptions_token_idx" ON "pending_subscriptions"("token");
CREATE INDEX "email_events_event_type_idx" ON "email_events"("event_type");
CREATE INDEX "email_events_contact_email_idx" ON "email_events"("contact_email");

-- Foreign key
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_newsletter_id_fkey" FOREIGN KEY ("newsletter_id") REFERENCES "newsletters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
