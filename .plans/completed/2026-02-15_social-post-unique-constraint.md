# Unique Constraint for Social Posts

## Problem

The invariant "at most one social post per story per platform" is enforced only at application level (`findFirst` check before insert). A race condition could create duplicate records. Adding a database unique constraint makes this airtight.

## Changes

### 1. Database Migration

Create a new migration adding unique constraints on `storyId` for both social post tables.

**Migration SQL:**

```sql
-- Add unique constraint: one post per story per platform
CREATE UNIQUE INDEX "bluesky_posts_story_id_key" ON "bluesky_posts" ("story_id");
CREATE UNIQUE INDEX "mastodon_posts_story_id_key" ON "mastodon_posts" ("story_id");
```

This replaces the existing non-unique `@@index([storyId])` on both tables. The unique index also serves as an index, so the existing `@@index([storyId])` can be replaced.

**Pre-flight check:** Before applying, verify no duplicate `storyId` values exist:

```sql
SELECT story_id, COUNT(*) FROM bluesky_posts GROUP BY story_id HAVING COUNT(*) > 1;
SELECT story_id, COUNT(*) FROM mastodon_posts GROUP BY story_id HAVING COUNT(*) > 1;
```

If duplicates exist, the admin should clean them up manually before applying the migration.

### 2. Prisma Schema

**`server/prisma/schema.prisma`** — Update both models:

**BlueskyPost:**
```prisma
model BlueskyPost {
  // ... existing fields ...
  storyId  String  @unique @map("story_id")  // was: @map("story_id") without @unique
  // ...
  // Remove: @@index([storyId])  -- replaced by unique constraint
  @@index([status])
  @@index([publishedAt])
  @@map("bluesky_posts")
}
```

**MastodonPost:**
```prisma
model MastodonPost {
  // ... existing fields ...
  storyId  String  @unique @map("story_id")  // was: @map("story_id") without @unique
  // ...
  // Remove: @@index([storyId])  -- replaced by unique constraint
  @@index([status])
  @@index([publishedAt])
  @@map("mastodon_posts")
}
```

### 3. Application Code

The existing application-level checks in `bluesky.ts` and `mastodon.ts` should stay as-is — they provide a better error message than a raw Prisma unique constraint violation. The DB constraint is a safety net, not a replacement.

### 4. Update specs

**`.specs/social-posting.allium`**

Remove the `open question` block (lines 155-156) since this is now resolved. Replace with:

```allium
-- Invariant: at most one SocialPost per (story, channel).
-- Enforced by database unique constraint on story_id per table,
-- with application-level pre-check for friendlier error messages.
-- Admins can delete a failed post and regenerate via the admin UI.
```

### 5. Update context docs

**`.context/bluesky.md`** and **`.context/mastodon.md`** — if they mention the duplicate prevention mechanism, note the unique constraint. If they don't have such a section, no changes needed.

## Migration Workflow

Migration file: `server/prisma/migrations/20260215120000_add_social_post_story_unique/migration.sql`

1. Pre-flight duplicate check in pgAdmin:
   ```sql
   SELECT story_id, COUNT(*) FROM bluesky_posts GROUP BY story_id HAVING COUNT(*) > 1;
   SELECT story_id, COUNT(*) FROM mastodon_posts GROUP BY story_id HAVING COUNT(*) > 1;
   ```
   If duplicates exist, clean them up manually before proceeding.
2. Execute the migration SQL in pgAdmin
3. Mark as resolved: `npm run db:migrate:resolve --prefix server -- --applied 20260215120000_add_social_post_story_unique`
4. Stop the dev server, then run `npm run db:generate --prefix server`

**Status: Applied 2026-02-15.**

## Scope

- `server/prisma/schema.prisma` (add `@unique` to `storyId`, remove `@@index([storyId])`)
- New migration SQL file
- `.specs/social-posting.allium` (resolve open question, document constraint)
- `.context/bluesky.md` / `.context/mastodon.md` (if applicable)
