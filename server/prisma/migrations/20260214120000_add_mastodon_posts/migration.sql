-- CreateTable
CREATE TABLE "mastodon_posts" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "status_id" TEXT,
    "status_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "post_text" TEXT NOT NULL,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "favourite_count" INTEGER NOT NULL DEFAULT 0,
    "boost_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "metrics_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mastodon_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mastodon_posts_status_id_key" ON "mastodon_posts"("status_id");

-- CreateIndex
CREATE INDEX "mastodon_posts_story_id_idx" ON "mastodon_posts"("story_id");

-- CreateIndex
CREATE INDEX "mastodon_posts_status_idx" ON "mastodon_posts"("status");

-- CreateIndex
CREATE INDEX "mastodon_posts_published_at_idx" ON "mastodon_posts"("published_at");

-- AddForeignKey
ALTER TABLE "mastodon_posts" ADD CONSTRAINT "mastodon_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename bluesky_auto_post to social_auto_post (now handles all channels)
UPDATE "job_runs" SET "job_name" = 'social_auto_post', "updated_at" = CURRENT_TIMESTAMP
WHERE "job_name" = 'bluesky_auto_post';

-- Add mastodon_update_metrics job (disabled by default)
INSERT INTO "job_runs" ("id", "job_name", "enabled", "cron_expression", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'mastodon_update_metrics', false, '0 4 * * *', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
