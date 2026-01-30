-- AlterTable
ALTER TABLE "issues" ADD COLUMN "parent_id" TEXT,
ADD COLUMN "intro" TEXT NOT NULL DEFAULT '',
ADD COLUMN "evaluation_intro" TEXT NOT NULL DEFAULT '',
ADD COLUMN "evaluation_criteria" TEXT NOT NULL DEFAULT '',
ADD COLUMN "source_names" TEXT NOT NULL DEFAULT '',
ADD COLUMN "make_a_difference" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
