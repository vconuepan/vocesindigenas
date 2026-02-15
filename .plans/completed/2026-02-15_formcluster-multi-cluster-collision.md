# FormCluster: Handle Multi-Cluster Collisions

## Problem

When `detectAndCluster()` finds confirmed duplicates that belong to different existing clusters, `findExistingCluster()` uses `prisma.story.findFirst()` without ordering — it joins whichever cluster the DB returns first. This is nondeterministic and can leave related stories in separate clusters.

## Decision

When confirmed duplicates span multiple clusters, the source story should join the cluster of the **newest duplicate** (by `dateCrawled`). This is deterministic and favors the most recent coverage cluster, which is likely the most active/relevant one.

If duplicates span multiple clusters, we do **not** auto-merge those clusters. Merging clusters is an admin action with side effects (published story rejection); automatic merging would be too aggressive. Instead, we join the newest duplicate's cluster and log a warning that other clusters exist with related stories.

## Changes

### 1. `server/src/services/dedup.ts` — `findExistingCluster()`

**Before:**
```typescript
async function findExistingCluster(storyIds: string[]): Promise<{ id: string } | null> {
  const story = await prisma.story.findFirst({
    where: {
      id: { in: storyIds },
      clusterId: { not: null },
    },
    select: { clusterId: true },
  })
  return story?.clusterId ? { id: story.clusterId } : null
}
```

**After:**
```typescript
async function findExistingCluster(storyIds: string[]): Promise<{ id: string; otherClusterIds?: string[] } | null> {
  const stories = await prisma.story.findMany({
    where: {
      id: { in: storyIds },
      clusterId: { not: null },
    },
    select: { clusterId: true, dateCrawled: true },
    orderBy: { dateCrawled: 'desc' },
  })

  if (stories.length === 0) return null

  // Pick the cluster of the newest duplicate
  const primaryClusterId = stories[0].clusterId!

  // Warn about multi-cluster collision (don't auto-merge)
  const uniqueClusterIds = [...new Set(stories.map(s => s.clusterId!))]
  const otherClusterIds = uniqueClusterIds.filter(id => id !== primaryClusterId)

  if (otherClusterIds.length > 0) {
    log.warn(
      { targetCluster: primaryClusterId, otherClusters: otherClusterIds, duplicateIds: storyIds },
      'multi-cluster collision: duplicates span multiple clusters, joining newest'
    )
  }

  return {
    id: primaryClusterId,
    ...(otherClusterIds.length > 0 ? { otherClusterIds } : {}),
  }
}
```

### 2. `server/src/services/dedup.ts` — `detectAndCluster()`

The caller doesn't need to change behavior — it already calls `addToCluster` and `updatePrimary` on the returned cluster. The only change is logging: the return value could include the `otherClusterIds` for observability.

```typescript
if (existingCluster) {
  await addToCluster(storyId, existingCluster.id)
  for (const dupId of duplicateIds) {
    const dup = await prisma.story.findUnique({ where: { id: dupId }, select: { clusterId: true } })
    if (!dup?.clusterId) {
      await addToCluster(dupId, existingCluster.id)
    }
  }
  await updatePrimary(existingCluster.id)
  const rejectedIds = await autoRejectNonPrimary(existingCluster.id)
  const memberCount = await prisma.story.count({ where: { clusterId: existingCluster.id } })
  return { clusterId: existingCluster.id, newCluster: false, memberCount, rejectedIds }
}
```

No structural changes — the existing logic of "add unclustered duplicates to the target cluster" is correct. Duplicates already in a different cluster stay there (not moved).

### 3. Update specs

**`.specs/dedup.allium`** — Update `FormCluster` rule:

```allium
rule FormCluster {
    when: FormCluster(source, duplicates)

    -- If duplicates belong to existing clusters, join the cluster
    -- of the newest duplicate (by date_crawled). Duplicates in other
    -- clusters stay where they are — merging is an admin action.
    let clustered = duplicates where cluster != null
        .sort_by(date_crawled desc)
    let existing = clustered.first?.cluster

    if existing != null:
        ensures: source.cluster = existing
        for dup in duplicates where cluster = null:
            ensures: dup.cluster = existing
        ensures: ElectPrimary(existing)
    else:
        let cluster = Cluster.created(primary: source)
        ensures: source.cluster = cluster
        for dup in duplicates:
            ensures: dup.cluster = cluster
        ensures: ElectPrimary(cluster)
}
```

### 4. Update context docs

**`.context/dedup.md`** — Under "How It Works" or a new "Multi-Cluster Collisions" section:

> **Multi-cluster collisions:** When confirmed duplicates belong to different existing clusters, the source story joins the cluster of the newest duplicate (by `dateCrawled`). Other clusters are not auto-merged — merging requires explicit admin action via the clusters page. A warning is logged when this occurs.

## Scope

- `server/src/services/dedup.ts` (update `findExistingCluster` to use deterministic ordering + warn on collision)
- `.specs/dedup.allium` (update `FormCluster` rule)
- `.context/dedup.md` (add multi-cluster collision documentation)
