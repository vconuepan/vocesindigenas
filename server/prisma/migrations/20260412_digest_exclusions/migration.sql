-- CreateTable: digest_exclusions
-- Stores per-user opt-outs from community email digests.
CREATE TABLE "digest_exclusions" (
    "id"           TEXT         NOT NULL,
    "user_id"      TEXT         NOT NULL,
    "community_id" TEXT         NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digest_exclusions_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint
ALTER TABLE "digest_exclusions" ADD CONSTRAINT "digest_exclusions_user_id_community_id_key" UNIQUE ("user_id", "community_id");

-- Index on community_id for digest job queries
CREATE INDEX "digest_exclusions_community_id_idx" ON "digest_exclusions"("community_id");

-- ForeignKey: user
ALTER TABLE "digest_exclusions" ADD CONSTRAINT "digest_exclusions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKey: community
ALTER TABLE "digest_exclusions" ADD CONSTRAINT "digest_exclusions_community_id_fkey"
    FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
