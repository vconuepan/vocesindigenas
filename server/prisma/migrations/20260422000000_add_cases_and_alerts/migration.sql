-- CreateTable: OngoingCase (Casos en curso)
-- Editorial grouping of stories by ongoing conflict or case.
-- Admins create cases with keywords; stories matching those keywords appear on /caso/:slug

CREATE TABLE "ongoing_cases" (
    "id"          TEXT        NOT NULL,
    "title"       TEXT        NOT NULL,
    "slug"        TEXT        NOT NULL,
    "description" TEXT,
    "keywords"    TEXT[]      NOT NULL DEFAULT '{}',
    "status"      TEXT        NOT NULL DEFAULT 'active',
    "image_url"   TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "ongoing_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ongoing_cases_slug_key" ON "ongoing_cases"("slug");
CREATE INDEX "ongoing_cases_status_idx" ON "ongoing_cases"("status");

-- CreateTable: AlertSubscription (Alertas por territorio)
-- Double opt-in email alert subscriptions tied to topic keywords.
-- Confirmed subscribers receive a daily digest when new stories match their topics.

CREATE TABLE "alert_subscriptions" (
    "id"           TEXT        NOT NULL,
    "email"        TEXT        NOT NULL,
    "topics"       TEXT[]      NOT NULL DEFAULT '{}',
    "token"        TEXT,
    "confirmed_at" TIMESTAMPTZ,
    "expires_at"   TIMESTAMPTZ NOT NULL,
    "active"       BOOLEAN     NOT NULL DEFAULT true,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alert_subscriptions_token_key" ON "alert_subscriptions"("token");
CREATE INDEX "alert_subscriptions_email_idx" ON "alert_subscriptions"("email");
CREATE INDEX "alert_subscriptions_token_idx" ON "alert_subscriptions"("token");
CREATE INDEX "alert_subscriptions_active_confirmed_idx" ON "alert_subscriptions"("active", "confirmed_at");

-- Seed: Job entry for daily alert sending (9am)
-- id uses gen_random_uuid() since job_runs.id has no DB-level default (Prisma generates it)
INSERT INTO "job_runs" ("id", "job_name", "cron_expression", "enabled", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'send_alerts', '0 9 * * *', true, NOW(), NOW())
ON CONFLICT ("job_name") DO NOTHING;
