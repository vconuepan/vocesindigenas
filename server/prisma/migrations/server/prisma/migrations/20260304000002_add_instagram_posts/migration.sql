CREATE TABLE "instagram_posts" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "instagram_post_id" TEXT,
    "permalink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "caption" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "instagram_posts_story_id_key" ON "instagram_posts"("story_id");
CREATE UNIQUE INDEX "instagram_posts_instagram_post_id_key" ON "instagram_posts"("instagram_post_id");
CREATE INDEX "instagram_posts_status_idx" ON "instagram_posts"("status");
CREATE INDEX "instagram_posts_published_at_idx" ON "instagram_posts"("published_at");
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
