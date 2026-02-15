# Job-Driven Spec Language

## Problem

The specs use `when: story: Story.status becomes X` for all automated transitions. This suggests reactive event-driven triggers, but the implementation uses scheduled polling jobs (cron). Someone reading the specs might expect event sourcing or message queues.

Allium is implementation-agnostic, so this isn't strictly wrong, but the specs should be more precise about the execution model to avoid misleading readers.

## Approach

Replace `becomes`-based triggers on automated rules with explicit job triggers. Use `becomes` only for truly reactive rules (like chained triggers). Add a module-level comment explaining the execution model.

## Changes

### `.specs/story-pipeline.allium`

**Add module comment at the top (after the existing header comment):**

```allium
-- Execution model: all stage transitions are driven by scheduled
-- polling jobs, not event triggers. Each job queries for eligible
-- stories and processes them in bulk. The rules below describe
-- per-story semantics; batching and concurrency are implementation
-- concerns.
```

**Replace rule triggers:**

| Rule | Current trigger | New trigger |
|------|----------------|-------------|
| `PreAssess` | `when: story: Story.status becomes fetched` | `when: PreAssessJobRuns(story)` with comment: `-- Polls for stories where status = fetched` |
| `Assess` | `when: story: Story.status becomes pre_analyzed` | `when: AssessJobRuns(story)` with comment: `-- Polls for pre_analyzed stories above threshold` |
| `RejectBelowFloor` | `when: story: Story.status becomes analyzed` | Remove entirely (see plan 03) |
| `RejectNonPrimary` | `when: story: Story.status becomes analyzed` | Keep as-is — this fires as part of the selection job |
| `Select` | `when: story: Story.status becomes analyzed` | `when: SelectJobRuns(story)` with comment: `-- Polls for analyzed stories with relevance >= selection_relevance_min` |
| `Publish` | `when: story: Story.status becomes selected` | `when: PublishJobRuns(story)` with comment: `-- Polls for stories where status = selected` |
| `TrashStory` / `RejectStory` | External stimuli | Keep as-is (these are genuinely event-driven admin actions) |

**Fold `RejectNonPrimary` into the `Select` rule** since it's part of the same job, not a separate trigger:

```allium
rule Select {
    when: SelectJobRuns(story)
    -- Polls for analyzed stories with relevance >= selection_relevance_min
    -- and is_primary. Non-primary cluster members are force-rejected
    -- as a safety net before LLM selection.
    requires: story.relevance >= config.selection_relevance_min
    requires: story.is_primary
    ensures: story.status = selected or story.status = rejected
}
```

### `.specs/dedup.allium`

The `FindCandidates` rule uses `when: DetectDuplicates(story)` which is a chained trigger — this is correct and should stay as-is (it's genuinely reactive, fired after the assess transaction commits).

### `.specs/social-posting.allium`

The `FindCandidates` rule already uses `when: SocialAutoPostJobRuns()` — no change needed. This was already correct.

## Scope

- `.specs/story-pipeline.allium` (trigger refactor)
- `.specs/dedup.allium` (no changes, just verify)
- `.specs/social-posting.allium` (no changes, already correct)
