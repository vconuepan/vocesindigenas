-- CreateEnum
CREATE TYPE "FeedRegion" AS ENUM ('north_america', 'western_europe', 'eastern_europe', 'middle_east_north_africa', 'sub_saharan_africa', 'south_southeast_asia', 'pacific', 'latin_america', 'global');

-- AlterTable
ALTER TABLE "feeds" ADD COLUMN "region" "FeedRegion";
