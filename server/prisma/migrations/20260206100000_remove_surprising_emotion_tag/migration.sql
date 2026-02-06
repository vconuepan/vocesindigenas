-- Null out existing surprising values
UPDATE "stories" SET "emotion_tag" = NULL WHERE "emotion_tag" = 'surprising';

-- Replace the enum type (PostgreSQL doesn't support ALTER TYPE REMOVE VALUE)
ALTER TYPE "EmotionTag" RENAME TO "EmotionTag_old";
CREATE TYPE "EmotionTag" AS ENUM ('uplifting', 'frustrating', 'scary', 'calm');
ALTER TABLE "stories" ALTER COLUMN "emotion_tag" TYPE "EmotionTag" USING "emotion_tag"::text::"EmotionTag";
DROP TYPE "EmotionTag_old";
