-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "issue_id" TEXT;

-- CreateIndex
CREATE INDEX "stories_issue_id_idx" ON "stories"("issue_id");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
