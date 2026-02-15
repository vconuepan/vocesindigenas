# Move Cluster Entity to Pipeline Spec

## Problem

The `Cluster` entity is defined in `dedup.allium`, but `story-pipeline.allium` references it via the `Story.cluster` field and the derived `Story.is_primary`. This creates a circular dependency: the pipeline spec needs the Cluster type but doesn't import it, while dedup imports the pipeline spec.

## Changes

### 1. `.specs/story-pipeline.allium`

Move the `Cluster` entity declaration from `dedup.allium` into `story-pipeline.allium`, alongside the `Story` entity it's tightly coupled to:

```allium
entity Cluster {
    members: Story with cluster = this
    primary: Story

    -- Derived
    member_count: members.count
}
```

Place it after the `Embedding` value type and before the Stage 1 rules section.

### 2. `.specs/dedup.allium`

- Remove the `entity Cluster { ... }` block (lines 16-22).
- The `use "./story-pipeline.allium" as pipeline` import already gives access to `Cluster` via `pipeline/Cluster`. Rules referencing `Cluster` don't need changes since Allium resolves imported types automatically.

### 3. No context doc or code changes

This is a spec-only structural refactor. The implementation and context docs are unaffected.

## Scope

- `.specs/story-pipeline.allium` (add Cluster entity)
- `.specs/dedup.allium` (remove Cluster entity)
