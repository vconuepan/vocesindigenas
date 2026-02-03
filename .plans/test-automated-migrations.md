# Test Automated Migrations in Production

Verify that `prisma migrate deploy` runs correctly during Render's build step by adding a throwaway column, deploying, then removing it.

## Prerequisites

- Backend build command on Render is already updated to:
  `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- Main branch deploys automatically on push (or you can trigger manually)

## Part 1: Add a test column

### Step 1 — Create the migration locally

Add a nullable column to a low-risk table (e.g. `Story`):

```prisma
// server/prisma/schema.prisma — add to the Story model
migrationTest String? @map("migration_test")
```

Generate the migration SQL without applying it locally:

```bash
npm run db:migrate:create --prefix server -- --name add_migration_test_column
```

This creates `server/prisma/migrations/<timestamp>_add_migration_test_column/migration.sql` containing something like:

```sql
ALTER TABLE "stories" ADD COLUMN "migration_test" TEXT;
```

### Step 2 — Commit and push

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "test: add migration_test column to verify automated deploys"
git push
```

### Step 3 — Watch the Render build log

In the Render dashboard, watch the backend build output. You should see:

```
> npx prisma migrate deploy
Prisma schema loaded from prisma/schema.prisma
...
1 migration applied successfully.
```

### Step 4 — Verify

- Health check returns 200: `curl https://<backend-url>/health`
- The column exists: check via pgAdmin or Render shell:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'stories' AND column_name = 'migration_test';
  ```

## Part 2: Remove the test column

### Step 5 — Create the drop migration

Remove the field from `schema.prisma`:

```prisma
// Delete the `migrationTest` line added in step 1
```

Generate the migration:

```bash
npm run db:migrate:create --prefix server -- --name drop_migration_test_column
```

The SQL should contain:

```sql
ALTER TABLE "stories" DROP COLUMN "migration_test";
```

### Step 6 — Commit and push

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "test: drop migration_test column — automated migration confirmed"
git push
```

### Step 7 — Watch the Render build log again

Confirm `1 migration applied successfully` in the output.

### Step 8 — Verify clean state

- Health check returns 200
- The column is gone:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'stories' AND column_name = 'migration_test';
  -- Should return 0 rows
  ```
- The app behaves normally (spot-check the public site and admin dashboard)

## Success criteria

- Both deploys complete without build failures
- `prisma migrate deploy` output is visible in the build log
- The column appears after part 1 and disappears after part 2
- No downtime — health check stays green throughout

## Cleanup

After confirming both migrations worked, optionally squash or delete the two test migration folders if you don't want them in the history. They're harmless to keep (already applied and recorded in `_prisma_migrations`), but the commits can be squashed into one if you prefer a tidy log.
