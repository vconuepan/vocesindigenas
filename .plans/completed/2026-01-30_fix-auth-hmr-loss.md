# Fix: Authentication Loss During Vite HMR

## Problem

During development, editing front-end or back-end files causes logout from the admin area. The access token is stored in a module-scoped variable in `admin-api.ts` (`let accessToken: string | null = null`). When Vite HMR re-executes the module, this resets to `null`, and `AdminLayout` redirects to `/admin/login` before recovery can happen.

The refresh token (httpOnly cookie) survives HMR and server restarts. A mount-time recovery exists in `auth.tsx` but only runs on React component mount — not when the API module is hot-replaced.

## Root Cause (Two Scenarios)

1. **`admin-api.ts` is edited**: Module re-executes, `accessToken` becomes `null`. The 401 retry guard (`if (res.status === 401 && accessToken)`) skips refresh because `accessToken` is falsy. User is logged out.

2. **`auth.tsx` or `AdminLayout.tsx` is edited**: React tree remounts. `AuthProvider`'s `useEffect` fires `authApi.refresh()` which should recover the session via the cookie. This path already works — unless `admin-api.ts` also reloaded in the dependency chain (falls back to scenario 1).

## Solution

Two small changes to one file: `client/src/lib/admin-api.ts`

### Change 1: Preserve access token across HMR

Add at the end of the file:

```typescript
// Preserve access token across Vite HMR (dev only, tree-shaken in production)
if (import.meta.hot) {
  if (import.meta.hot.data?.accessToken) {
    accessToken = import.meta.hot.data.accessToken
  }
  import.meta.hot.dispose((data) => {
    data.accessToken = accessToken
  })
}
```

This is the standard Vite pattern for preserving module state during HMR. The block is dead code in production builds.

### Change 2: Remove `&& accessToken` guard from 401 retry

In `request()` (~line 88) and `requestBlob()` (~line 123), change:

```typescript
// Before
if (res.status === 401 && accessToken) {

// After
if (res.status === 401) {
```

This ensures the refresh-via-cookie path works even when the in-memory token is `null`. The `refreshAccessToken()` function already returns `null` when the cookie is invalid, so there's no infinite loop risk.

## Files Modified

- `client/src/lib/admin-api.ts` — HMR preservation block + 401 guard fix

## Files NOT Modified (already correct)

- `client/src/lib/auth.tsx` — Mount-time recovery handles React component remounts
- `client/src/layouts/AdminLayout.tsx` — `isLoading` spinner already covers the recovery window

## Verification (Manual)

1. Log in to admin dashboard
2. Edit `admin-api.ts` (e.g., add a comment), save → should stay logged in
3. Edit `auth.tsx`, save → brief spinner, then dashboard restored
4. Edit `AdminLayout.tsx`, save → brief spinner, then dashboard restored
5. Edit a random component file, save → no disruption

## Risk Assessment

- **Production**: Zero impact (`import.meta.hot` block is tree-shaken)
- **Security**: Zero impact (token stays in memory, HMR data is also in-memory dev-only)
- **Regression**: Very low (401 guard removal is more permissive but safely handled by existing null checks)
