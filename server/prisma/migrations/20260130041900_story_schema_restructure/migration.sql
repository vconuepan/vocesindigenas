-- Story schema restructure: rename source fields, simplify ratings, drop unused columns

-- Step 1: Rename existing columns
ALTER TABLE "stories" RENAME COLUMN "url" TO "source_url";
ALTER TABLE "stories" RENAME COLUMN "title" TO "source_title";
ALTER TABLE "stories" RENAME COLUMN "content" TO "source_content";
ALTER TABLE "stories" RENAME COLUMN "date_published" TO "source_date_published";
ALTER TABLE "stories" RENAME COLUMN "relevance_rating_low" TO "relevance_pre";
ALTER TABLE "stories" RENAME COLUMN "ai_summary" TO "summary";
ALTER TABLE "stories" RENAME COLUMN "ai_quote" TO "quote";
ALTER TABLE "stories" RENAME COLUMN "ai_marketing_blurb" TO "marketing_blurb";
ALTER TABLE "stories" RENAME COLUMN "ai_relevance_reasons" TO "relevance_reasons";
ALTER TABLE "stories" RENAME COLUMN "ai_antifactors" TO "antifactors";
ALTER TABLE "stories" RENAME COLUMN "ai_relevance_calculation" TO "relevance_calculation";

-- Step 2: Add new columns
ALTER TABLE "stories" ADD COLUMN "title" TEXT;
ALTER TABLE "stories" ADD COLUMN "date_published" TIMESTAMP(3);
ALTER TABLE "stories" ADD COLUMN "relevance" INTEGER;

-- Step 3: Drop removed columns
ALTER TABLE "stories" DROP COLUMN IF EXISTS "relevance_rating_high";
ALTER TABLE "stories" DROP COLUMN IF EXISTS "ai_response";
ALTER TABLE "stories" DROP COLUMN IF EXISTS "ai_keywords";
ALTER TABLE "stories" DROP COLUMN IF EXISTS "ai_scenarios";

-- Step 4: Update unique constraint (url -> source_url already handled by rename)
-- The unique index on "url" is automatically renamed with the column
