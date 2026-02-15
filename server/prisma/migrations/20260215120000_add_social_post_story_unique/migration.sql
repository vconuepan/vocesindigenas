-- Add unique constraint: one post per story per platform.
-- Replaces the non-unique @@index([storyId]) on each table.

-- Pre-flight: verify no duplicate story_id values exist before applying.
-- SELECT story_id, COUNT(*) FROM bluesky_posts GROUP BY story_id HAVING COUNT(*) > 1;
-- SELECT story_id, COUNT(*) FROM mastodon_posts GROUP BY story_id HAVING COUNT(*) > 1;

-- Drop existing non-unique indexes
DROP INDEX IF EXISTS "bluesky_posts_story_id_idx";
DROP INDEX IF EXISTS "mastodon_posts_story_id_idx";

-- Add unique constraints (also serve as indexes)
CREATE UNIQUE INDEX "bluesky_posts_story_id_key" ON "bluesky_posts" ("story_id");
CREATE UNIQUE INDEX "mastodon_posts_story_id_key" ON "mastodon_posts" ("story_id");
