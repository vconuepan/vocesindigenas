# Dedup Redirect: Document as 302 (Temporary) by Choice

## Problem

The context doc `.context/dedup.md` says the redirect is 301 (permanent), but the code uses 302 (temporary). This is intentional: cluster primaries can change via admin actions (set primary, merge, dissolve), so a permanent redirect would be incorrect — browsers and search engines would cache the old redirect.

The spec and docs should reflect the 302 choice with an explanation of why.

## Changes

### 1. `.context/dedup.md`

**Line 112:** Change:
> its public URL redirects (301) to the primary story's URL

To:
> its public URL redirects (302, temporary) to the primary story's URL. A temporary redirect is used because cluster primaries can change via admin actions (re-clustering, merge, set-primary).

**Line 114:** Change:
> Returns 301 redirect to `/api/stories/<primary-slug>`

To:
> Returns 302 redirect to `/api/stories/<primary-slug>`

### 2. `.specs/dedup.allium`

**Line 173:** Change:
> its public URL 301-redirects to the primary.

To:
> its public URL temporarily redirects (302) to the primary.
> Temporary because cluster primaries can change via admin actions.

Update the `guarantee` block to be explicit:

```allium
guarantee:
    if not story.is_primary:
        temporary_redirect_to StoryPage(story.cluster.primary)
```

### 3. No code changes

The code already uses 302. This is docs/spec only.

## Scope

- `.context/dedup.md` (fix 301 -> 302 with rationale)
- `.specs/dedup.allium` (fix redirect comment + guarantee block)
