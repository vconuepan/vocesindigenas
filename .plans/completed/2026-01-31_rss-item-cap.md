# Plan: Raise RSS Item Cap to 30

## Decision: Raise global default to 30, no per-feed override

## Goal

The RSS item limit defaults to 20 which may silently drop articles from high-volume feeds. Raise to 30.

## Current State

- `server/src/config.ts`: `rssItemLimit` defaults to 20, configurable via `RSS_ITEM_LIMIT` env var
- Already in config — this is a one-line change

## Changes

### 1. Raise default in config

**`server/src/config.ts`:**
- Change default from `'20'` to `'30'`

That's it. No schema changes, no per-feed override.

## Testing

- Update any tests that reference the 20-item default
