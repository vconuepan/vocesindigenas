CREATE TABLE "linkedin_posts" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "linkedin_post_id" TEXT,
    "post_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "post_text" TEXT NOT NULL,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "linkedin_posts_story_id_key" ON "linkedin_posts"("story_id");
CREATE UNIQUE INDEX "linkedin_posts_linkedin_post_id_key" ON "linkedin_posts"("linkedin_post_id");
CREATE INDEX "linkedin_posts_status_idx" ON "linkedin_posts"("status");
CREATE INDEX "linkedin_posts_published_at_idx" ON "linkedin_posts"("published_at");

ALTER TABLE "linkedin_posts" ADD CONSTRAINT "linkedin_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
