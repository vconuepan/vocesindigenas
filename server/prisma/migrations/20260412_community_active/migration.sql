-- Add active field to communities table (default true so all existing communities stay visible)
ALTER TABLE "communities" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
