-- CreateTable
CREATE TABLE "bluesky_posts" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "post_uri" TEXT,
    "post_cid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "post_text" TEXT NOT NULL,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "repost_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "quote_count" INTEGER NOT NULL DEFAULT 0,
    "metrics_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bluesky_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bluesky_posts_post_uri_key" ON "bluesky_posts"("post_uri");

-- CreateIndex
CREATE INDEX "bluesky_posts_story_id_idx" ON "bluesky_posts"("story_id");

-- CreateIndex
CREATE INDEX "bluesky_posts_status_idx" ON "bluesky_posts"("status");

-- CreateIndex
CREATE INDEX "bluesky_posts_published_at_idx" ON "bluesky_posts"("published_at");

-- AddForeignKey
ALTER TABLE "bluesky_posts" ADD CONSTRAINT "bluesky_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed job_runs for Bluesky jobs
INSERT INTO "job_runs" ("id", "job_name", "cron_expression", "enabled", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'bluesky_auto_post', '0 9,18 * * *', false, NOW(), NOW()),
  (gen_random_uuid(), 'bluesky_update_metrics', '0 3 * * *', false, NOW(), NOW());
