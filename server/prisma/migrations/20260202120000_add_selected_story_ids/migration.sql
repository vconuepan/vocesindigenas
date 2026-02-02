-- AlterTable
ALTER TABLE "newsletters" ADD COLUMN "selected_story_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
