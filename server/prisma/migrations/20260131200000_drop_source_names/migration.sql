-- DropSourceNames
-- Drop the source_names column from issues table.
-- Source names are now derived dynamically from active feed titles.

ALTER TABLE "issues" DROP COLUMN "source_names";
