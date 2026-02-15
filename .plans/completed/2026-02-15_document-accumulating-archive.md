# Document Accumulating Archive as Intentional

## Problem

Stories that don't advance through the pipeline (pre_analyzed below threshold, analyzed below relevance floor) currently accumulate. With plan 03 (quality gate rejections), these will be actively rejected instead. However, **rejected stories themselves** accumulate indefinitely as an archive. This is intentional and should be documented.

Note: After plan 03 is implemented, there will no longer be stories stuck in limbo states. All stories will eventually reach a terminal status (published, rejected, or trashed).

## Changes

### 1. `.specs/story-pipeline.allium`

Add a comment after the status enum:

```allium
-- Terminal statuses: published, rejected, trashed.
-- Rejected and trashed stories accumulate as a permanent archive.
-- This is intentional — they serve as a historical record and
-- may be revisited by admins. No automated cleanup.
```

### 2. `.context/story-pipeline.md`

Add a note under "Status Definitions" or as a new subsection "Archive Behavior":

> **Archive behavior:** Rejected and trashed stories are retained indefinitely as a historical archive. There is no automated cleanup or purging. Admins can review rejected stories via the admin panel and manually re-assess or republish them if needed.

## Scope

- `.specs/story-pipeline.allium` (add archive comment)
- `.context/story-pipeline.md` (add archive behavior note)
