-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('general', 'bug', 'suggestion', 'other');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "email" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'unread',
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");
