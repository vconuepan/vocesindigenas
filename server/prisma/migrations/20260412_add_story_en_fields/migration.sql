ALTER TABLE "stories"
  ADD COLUMN IF NOT EXISTS "title_en" TEXT,
  ADD COLUMN IF NOT EXISTS "title_label_en" TEXT,
  ADD COLUMN IF NOT EXISTS "summary_en" TEXT,
  ADD COLUMN IF NOT EXISTS "quote_en" TEXT,
  ADD COLUMN IF NOT EXISTS "marketing_blurb_en" TEXT,
  ADD COLUMN IF NOT EXISTS "relevance_summary_en" TEXT;
