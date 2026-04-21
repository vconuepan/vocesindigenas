-- CreateTable: Spotlight (En Foco)
-- Editorial tool to configure a topic of the moment (e.g. "Foro Permanente ONU 2025")
-- with keywords that filter stories, shown as a rotating band on the homepage.

CREATE TABLE "spotlights" (
    "id"         TEXT        NOT NULL,
    "label"      TEXT        NOT NULL,
    "keywords"   TEXT[]      NOT NULL DEFAULT '{}',
    "is_active"  BOOLEAN     NOT NULL DEFAULT true,
    "starts_at"  TIMESTAMPTZ,
    "ends_at"    TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "spotlights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "spotlights_is_active_idx" ON "spotlights"("is_active");
