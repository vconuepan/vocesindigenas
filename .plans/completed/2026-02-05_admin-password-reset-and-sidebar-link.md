# Plan: Admin Password Reset UI + Sidebar Website Link + Email Editing

**Status: COMPLETED**

## Requirements

1. **Set password for users** — Add UI in the admin area to let admins reset a user's password.
2. **Sidebar website link** — Add a link to the public website in the admin sidebar.
3. **Edit user email** — Allow admins to change users' email addresses (added during implementation).

## What Was Done

### Feature 1: Set Password for Users

- Added `resetPassword(id, password)` to `adminApi.users` in `client/src/lib/admin-api.ts`
- Added `useResetPassword` mutation hook in `client/src/hooks/useUsers.ts`
- Added `PasswordResetSection` collapsible component in `UserEditPanel.tsx` with password + confirm fields, mismatch validation, toast feedback
- Enter key in password fields is intercepted to prevent parent form submission (review fix)

### Feature 2: Sidebar Website Link

- Added "View Website" link with `ArrowTopRightOnSquareIcon` in sidebar footer of `AdminLayout.tsx`
- Opens in new tab with `sr-only` accessibility hint (review fix)

### Feature 3: Edit User Email

- Added `email` to `updateUserSchema` in `server/src/schemas/user.ts`
- Updated `updateUser` service to accept `email` in `server/src/services/user.ts`
- Added P2002 (duplicate email) error handling in `server/src/routes/admin/users.ts`
- Updated API client and hook types to include `email`
- Replaced read-only email display with editable `<Input>` in `UserEditPanel.tsx`

## Files Changed

| File | Change |
|------|--------|
| `client/src/lib/admin-api.ts` | Add `resetPassword` method, add `email` to update type |
| `client/src/hooks/useUsers.ts` | Add `useResetPassword` hook, add `email` to update type |
| `client/src/components/admin/UserEditPanel.tsx` | Add password reset UI, make email editable |
| `client/src/layouts/AdminLayout.tsx` | Add website link to sidebar |
| `server/src/schemas/user.ts` | Add `email` to `updateUserSchema` |
| `server/src/services/user.ts` | Add `email` to `updateUser` function signature |
| `server/src/routes/admin/users.ts` | Add P2002 error handling for duplicate email |
