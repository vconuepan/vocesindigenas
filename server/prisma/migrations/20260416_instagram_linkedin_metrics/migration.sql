-- Add engagement metrics fields to instagram_posts
ALTER TABLE "instagram_posts"
  ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metrics_updated_at" TIMESTAMPTZ;

-- Add engagement metrics fields to linkedin_posts
ALTER TABLE "linkedin_posts"
  ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "impression_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metrics_updated_at" TIMESTAMPTZ;
