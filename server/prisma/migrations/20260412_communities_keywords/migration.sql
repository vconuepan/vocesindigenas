-- Add TERRITORIO to CommunityType enum
ALTER TYPE "CommunityType" ADD VALUE 'TERRITORIO';

-- Add keywords column to communities table
ALTER TABLE "communities" ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT '{}';
