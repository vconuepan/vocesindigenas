-- CreateIndex: Story composite indexes for common query patterns
CREATE INDEX "stories_status_date_crawled_idx" ON "stories"("status", "date_crawled");
CREATE INDEX "stories_feed_id_idx" ON "stories"("feed_id");
CREATE INDEX "stories_status_relevance_pre_idx" ON "stories"("status", "relevance_pre");
CREATE INDEX "stories_status_relevance_idx" ON "stories"("status", "relevance");
CREATE INDEX "stories_date_published_idx" ON "stories"("date_published");

-- CreateIndex: RefreshToken expiry for cleanup queries
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
