-- AlterTable
ALTER TABLE "stories" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");
