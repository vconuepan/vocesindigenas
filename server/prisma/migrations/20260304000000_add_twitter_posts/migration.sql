-- CreateTable
CREATE TABLE "twitter_posts" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "tweet_id" TEXT,
    "tweet_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "post_text" TEXT NOT NULL,
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "retweet_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "quote_count" INTEGER NOT NULL DEFAULT 0,
    "metrics_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twitter_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "twitter_posts_story_id_key" ON "twitter_posts"("story_id");

-- CreateIndex
CREATE UNIQUE INDEX "twitter_posts_tweet_id_key" ON "twitter_posts"("tweet_id");

-- CreateIndex
CREATE INDEX "twitter_posts_status_idx" ON "twitter_posts"("status");

-- CreateIndex
CREATE INDEX "twitter_posts_published_at_idx" ON "twitter_posts"("published_at");

-- AddForeignKey
ALTER TABLE "twitter_posts" ADD CONSTRAINT "twitter_posts_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
