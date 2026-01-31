-- AlterTable: Add family tracking columns for refresh token reuse detection
ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "rotated_at" TIMESTAMP(3);

-- Backfill: Assign unique family IDs to existing tokens
UPDATE "refresh_tokens" SET "family_id" = gen_random_uuid()::TEXT WHERE "family_id" IS NULL;

-- Make family_id NOT NULL after backfill
ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
