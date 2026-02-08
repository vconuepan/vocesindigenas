-- CreateTable
CREATE TABLE "story_clusters" (
    "id" TEXT NOT NULL,
    "primary_story_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "story_clusters_primary_story_id_key" ON "story_clusters"("primary_story_id");

-- AlterTable: add cluster_id to stories
ALTER TABLE "stories" ADD COLUMN "cluster_id" TEXT;

-- CreateIndex
CREATE INDEX "stories_cluster_id_idx" ON "stories"("cluster_id");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "story_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_primary_story_id_fkey" FOREIGN KEY ("primary_story_id") REFERENCES "stories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
