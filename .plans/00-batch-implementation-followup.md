# Batch Implementation Follow-Up

## User Input Needed

_(none yet)_

## DB Migrations

### Plan 07: Social Post Unique Constraint

Migration file: `server/prisma/migrations/20260215120000_add_social_post_story_unique/migration.sql`

Steps:
1. Run the pre-flight duplicate check in pgAdmin:
   ```sql
   SELECT story_id, COUNT(*) FROM bluesky_posts GROUP BY story_id HAVING COUNT(*) > 1;
   SELECT story_id, COUNT(*) FROM mastodon_posts GROUP BY story_id HAVING COUNT(*) > 1;
   ```
   If duplicates exist, clean them up manually before proceeding.
2. Execute the migration SQL in pgAdmin
3. Mark as resolved: `npm run db:migrate:resolve --prefix server -- --applied 20260215120000_add_social_post_story_unique`
4. Stop the dev server, then run `npm run db:generate --prefix server`

## Files to Be Deleted

_(none yet)_

## Implementation Issues

_(none yet)_
