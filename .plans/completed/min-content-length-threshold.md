# Plan: Raise Minimum Content Length Threshold

## Goal

The current 50-character minimum for extracted content is too low — a 50-character "article" is almost certainly a failed extraction. Raise the default and ensure it's visible in config.

## Current State

- `server/src/config.ts` already has `minContentLength` set to `50` with `MIN_CONTENT_LENGTH` env var override
- Applied in `server/src/services/extractor.ts` at three extraction points (CSS selector, Readability, PipFeed)
- The threshold is already configurable — just the default is too low

## Changes

### 1. Raise default threshold

**`server/src/config.ts`:**
- Change default from `'50'` to `'200'`

That's it. The infrastructure is already in place.

## Decisions

- **Default: 300 characters** (Option C)
- **No per-feed override** — global config only

## Testing

- Update any existing tests that rely on the 50-character threshold
- Unit test: content below threshold is rejected
- Unit test: content at/above threshold is accepted
