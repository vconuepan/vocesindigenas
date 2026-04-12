-- CreateTable: magic_links
-- Used for passwordless authentication via email magic links.
CREATE TABLE "magic_links" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "email"       TEXT        NOT NULL,
    "token"       TEXT        NOT NULL,
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "used_at"     TIMESTAMP(3),
    "redirect_to" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_token_idx" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_expires_at_idx" ON "magic_links"("expires_at");
