# Plan: Fix Admin-Vendor Bundle Loading on Public Pages

**Status:** ✅ Resolved

## Problem Statement

Public visitors were downloading the `admin-vendor` chunk (266KB / 86KB gzipped) even though they never use admin functionality. This added ~86KB to the initial page load and caused Lighthouse to flag "unused JavaScript."

## Root Cause

The `manualChunks` configuration in `vite.config.ts` forced `@headlessui/react`, `@heroicons/react`, and their transitive dependencies (`@react-aria`, `@react-stately`, `@floating-ui`, `@internationalized`) into a separate `admin-vendor` chunk.

When Rollup processed these packages, some React internal modules got assigned to `admin-vendor` first (Rollup uses "first encounter wins" for chunk assignment). Since the main bundle also needed those React utilities, it created a static import from `admin-vendor`, causing the browser to download it even for public visitors.

## Solution

**Removed `manualChunks` entirely** from `vite.config.ts`. Rollup now handles chunking automatically based on the `React.lazy()` dynamic imports in `App.tsx`.

This works because:
1. Admin pages are already lazy-loaded via `React.lazy()`
2. `@headlessui/react` and `@heroicons/react` are only imported by admin components
3. Rollup's default chunking keeps lazy-loaded code in separate chunks
4. No forced chunk assignment means no React internal sharing issues

## Results

**Before:**
- Main bundle: 295KB / 84KB gzipped
- admin-vendor: 266KB / 86KB gzipped (always preloaded)
- **Total for public visitors: 170KB gzipped**

**After:**
- Main bundle: 438KB / 129KB gzipped
- Admin chunks (dialog, icons): Only loaded when visiting admin pages
- **Total for public visitors: 129KB gzipped**

**Improvement: 41KB (24%) reduction in transfer size for public visitors**

The main bundle is larger, but public visitors no longer download unused admin code. The admin UI libraries are automatically code-split into separate chunks loaded only when needed.

## Files Changed

- `client/vite.config.ts`: Removed `manualChunks` configuration
- `CLAUDE.md`: Updated Bundle Splitting section

## What Didn't Work

| Approach | Result |
|----------|--------|
| Keeping only @headlessui/@heroicons in manualChunks | Same issue — transitive deps still caused React internal sharing |
| Explicit `return undefined` for React packages | No effect — React wasn't being matched, issue was internal module placement |
| Object-style manualChunks with explicit package names | Same result |
| Add framework chunk for React | Empty chunk — React was already in main bundle |
| modulePreload.resolveDependencies filter | Only removed preload hint, didn't prevent static import |
