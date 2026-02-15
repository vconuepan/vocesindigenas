# Quality Gate Rejections at Assess and Select Stages

## Problem

Currently, stories that don't meet quality thresholds are silently ignored by downstream jobs:

1. **Assess job**: Queries only `pre_analyzed` stories with `relevancePre >= threshold`. Stories below threshold stay as `pre_analyzed` forever.
2. **Select job**: Queries only `analyzed` stories with `relevance >= selection.relevanceMin`. Stories below threshold stay as `analyzed` forever.

This creates limbo states where stories accumulate without resolution. The next step in the pipeline should actively reject stories that don't meet its quality gates.

## Changes

### 1. Assess job rejects low pre-rated stories

**File: `server/src/jobs/assessStories.ts`**

After collecting `allIds` (stories that qualify), query for the remaining `pre_analyzed` stories that were skipped and reject them:

```typescript
// Reject pre_analyzed stories that don't meet threshold
const allPreAnalyzed = await getStoryIdsByStatus('pre_analyzed')
const qualifiedSet = new Set(allIds)
const belowThreshold = allPreAnalyzed.filter(id => !qualifiedSet.has(id))

if (belowThreshold.length > 0) {
  await prisma.story.updateMany({
    where: { id: { in: belowThreshold } },
    data: { status: 'rejected' },
  })
  log.info({ count: belowThreshold.length }, 'rejected pre_analyzed stories below assessment threshold')
}
```

This approach correctly handles issue-specific thresholds — a story assigned to an issue with `minPreRating: 3` that scored `relevancePre: 4` passes, while one on an issue with `minPreRating: 7` that scored `4` gets rejected. The existing per-issue loop already computes this; stories not collected into `allIds` are the ones below threshold.

**File: `server/src/services/story.ts`**

No changes needed — `getStoryIdsByStatus('pre_analyzed')` without a `ratingMin` filter already returns all pre-analyzed stories.

### 2. Select job rejects low-relevance analyzed stories

**File: `server/src/jobs/selectStories.ts`**

After collecting the qualifying IDs, reject the rest:

```typescript
// Reject analyzed stories below relevance threshold
const allAnalyzed = await getStoryIdsByStatus('analyzed')
const qualifiedSet = new Set(ids)
const belowThreshold = allAnalyzed.filter(id => !qualifiedSet.has(id))

if (belowThreshold.length > 0) {
  await prisma.story.updateMany({
    where: { id: { in: belowThreshold } },
    data: { status: 'rejected' },
  })
  log.info({ count: belowThreshold.length }, 'rejected analyzed stories below selection relevance minimum')
}
```

### 3. Selection threshold: global only

The selection stage uses only the global `config.selection.relevanceMin`. The assess stage already filters aggressively per-issue, so a single global floor is sufficient for the surviving pool.

### 4. Backfill: handled by next job run

Existing limbo stories will be rejected naturally when the next assess/select job runs after deployment. No one-time script needed.

### 5. Update specs

**`.specs/story-pipeline.allium`**

Add rejection rules:

```allium
-- Stories that don't meet the assessment threshold are rejected
-- by the assess job rather than left in limbo.
rule RejectBelowAssessThreshold {
    when: AssessJobRuns(story)
    requires: story.status = pre_analyzed
    requires: story.relevance_pre < story.assessment_threshold
    ensures: story.status = rejected
}

-- Stories that don't meet the selection floor are rejected
-- by the select job rather than left in limbo.
rule RejectBelowSelectionFloor {
    when: SelectJobRuns(story)
    requires: story.status = analyzed
    requires: story.relevance < config.selection_relevance_min
    ensures: story.status = rejected
}
```

Remove the old `RejectBelowFloor` rule (which was inaccurate).

### 5. Update context docs

**`.context/story-pipeline.md`**

Update transition rules:
- **pre_analyzed -> analyzed/rejected**: "Assess job picks stories with `relevancePre >= threshold` (per-issue `minPreRating` or global `fullAssessmentThreshold`). Stories below threshold are rejected."
- **analyzed -> selected/rejected**: "Select job takes `analyzed` stories with `relevance >= config.selection.relevanceMin`. Stories below threshold are rejected. Remaining candidates go through LLM selection (~50% selected, rest rejected)."

Update the status definitions table to add `rejected` sources: "Select job, assess job, or admin"

## Scope

- `server/src/jobs/assessStories.ts` (add rejection of below-threshold stories)
- `server/src/jobs/selectStories.ts` (add rejection of below-threshold stories)
- `.specs/story-pipeline.allium` (add rejection rules, remove old inaccurate rule)
- `.context/story-pipeline.md` (update transition descriptions)
