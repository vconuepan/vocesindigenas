-- Create page_views table for self-hosted analytics
CREATE TABLE "page_views" (
  "id"    TEXT NOT NULL,
  "path"  VARCHAR(500) NOT NULL,
  "date"  TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "page_views_path_date_key" ON "page_views"("path", "date");
CREATE INDEX "page_views_date_idx" ON "page_views"("date");
