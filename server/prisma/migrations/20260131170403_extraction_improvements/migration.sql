-- AlterTable
ALTER TABLE "feeds" ADD COLUMN     "consecutive_empty_crawls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "consecutive_failed_crawls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_crawl_error" TEXT,
ADD COLUMN     "last_crawl_error_at" TIMESTAMP(3),
ADD COLUMN     "last_crawl_result" TEXT,
ADD COLUMN     "last_etag" TEXT,
ADD COLUMN     "last_modified" TEXT,
ADD COLUMN     "last_successful_crawl_at" TIMESTAMP(3);
