# Dynamic Issue Sources ✅ IMPLEMENTED

## Problem

Issue sources ("Our Sources" on the public site) are currently stored as a hardcoded JSON string array (`sourceNames`) in the `issues` table. Admins manually type source names, which can get out of sync with the actual feeds connected to an issue.

## Solution

Derive the source list dynamically from the `title` field of **active** feeds linked to each issue. Remove the `sourceNames` column and its associated admin editing UI entirely.

## Changes

### Phase 1: Backend — Derive sources from feeds

**`server/src/services/issue.ts`**

1. In `getPublicIssues()`: include active feed titles in the query, map them into a `sourceNames: string[]` field on the response.
2. In `getPublicIssueBySlug()`: same — include active feed titles and map to `sourceNames`.
3. In `getAllIssues()` (admin): include active feed titles so the admin can see the derived sources.
4. In `getIssueById()` (admin): include active feed titles.
5. Remove `sourceNames` from `PUBLIC_ISSUE_SELECT` and from `parsePublicIssueJson` / `parseJsonFields` / `serializeJsonFields`.

**`server/src/schemas/issue.ts`**

6. Remove `sourceNames` from `createIssueSchema` and `updateIssueSchema`.

**`shared/types/index.ts`**

7. Keep `sourceNames: string[]` on the `Issue` interface (the field is still returned, just computed instead of stored).

### Phase 2: Client — Remove admin editor, keep public display

**`client/src/pages/admin/IssueEditPage.tsx`**

8. Remove the "Source Names" array editor section (lines ~239-272).
9. Add a read-only display of derived source names (feed titles) so admins can see which sources are connected.

**`client/src/components/admin/IssueEditPanel.tsx`**

10. Remove the `sourceNames` ArrayField. Add a read-only display of feed titles instead.

**`client/src/pages/IssuePage.tsx` and `client/src/pages/IssuesPage.tsx`**

11. No changes needed — they already render `issue.sourceNames` as badges. The data shape stays the same.

### Phase 3: Database migration

12. Create a Prisma migration to drop the `source_names` column from the `issues` table.
13. Remove `sourceNames` field from the `Issue` model in `schema.prisma`.

### Phase 4: Cleanup

14. Remove all `sourceNames` serialization/deserialization logic from the issue service.
15. Run type checker, linter, and tests to confirm nothing is broken.

## Risks

- **Low**: Feed titles may not be as polished as manually curated source names. Mitigation: admins can update feed titles via the existing feed management UI.
- **Low**: If an issue has no active feeds, the sources section will be empty (same behavior as today when sourceNames is empty).

## Migration Order

The safest order is: backend changes first (compute sourceNames from feeds), then client changes (remove editor), then database migration (drop column). This way the column still exists during development and the migration is the final step.
