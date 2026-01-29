# Authentication

The admin panel uses JWT-only authentication: access tokens (15 min) with httpOnly refresh token cookies (24 hours) for browser sessions. A separate `requireApiKey` middleware exists for public API consumers (mobile apps, etc.) that need authenticated read access — the static API key cannot access admin endpoints.

## Architecture

### Server

- **Auth middleware** (`server/src/middleware/auth.ts`): `requireAuth` accepts JWT only (used on admin routes). `requireApiKey` accepts the static `PUBLIC_API_KEY` (used on public API routes that need authenticated access). `requireRole(...roles)` checks user role after auth.
- **Auth service** (`server/src/services/auth.ts`): Password hashing (bcryptjs, 12 rounds), JWT generation/verification (`JWT_SECRET` env var, 15 min expiry), refresh token creation/rotation/revocation (stored in `refresh_tokens` DB table, 24h expiry).
- **User service** (`server/src/services/user.ts`): CRUD operations for user management. Returns sanitized objects (no `passwordHash`).
- **Auth routes** (`server/src/routes/auth.ts`): Public routes at `/api/auth` — login, refresh, logout, me.
- **User routes** (`server/src/routes/admin/users.ts`): Admin-only CRUD at `/api/admin/users`. Blocks self-delete, revokes tokens on user deletion.

### Client

- **Auth context** (`client/src/lib/auth.tsx`): `AuthProvider` wraps the app. On mount, attempts silent refresh via cookie. Exposes `user`, `isAuthenticated`, `login(email, password)`, `logout()`.
- **API client** (`client/src/lib/admin-api.ts`): Access token stored in module-scoped variable (not localStorage — XSS-safe). On 401, auto-refreshes via `/api/auth/refresh` and retries. Deduplicates concurrent refresh calls.
- **Login page** (`client/src/pages/admin/LoginPage.tsx`): Email + password form.
- **Users page** (`client/src/pages/admin/UsersPage.tsx`): Admin user management with create/edit/delete dialogs.

## Token Flow

1. **Login**: `POST /api/auth/login` with `{ email, password }` returns `{ accessToken, user }` + sets `refresh_token` httpOnly cookie
2. **API calls**: `Authorization: Bearer <accessToken>` header on every request
3. **Token expiry**: On 401, client calls `POST /api/auth/refresh` (cookie sent automatically), gets new access token, retries original request
4. **Logout**: `POST /api/auth/logout` revokes refresh token in DB, clears cookie, clears in-memory access token

## Cookie Configuration

- `httpOnly: true` — not accessible from JavaScript
- `secure: true` — only in production (HTTPS)
- `sameSite: strict` — prevents CSRF
- `path: /api/auth` — only sent to auth endpoints
- `maxAge: 24 hours`

## Environment Variables

- `JWT_SECRET` — Required. Random string (32+ chars) for signing JWTs
- `PUBLIC_API_KEY` — Optional. Static key for public API consumers (mobile apps, external services). Does **not** grant admin access.

## Database Models

- `User` (`users` table): id, email, name, passwordHash, role (admin/editor/viewer), timestamps
- `RefreshToken` (`refresh_tokens` table): id, token, userId, expiresAt, createdAt. Cascade-deleted with user.

## Roles

- `admin` — Full access, can manage users
- `editor` — Future use
- `viewer` — Future use (default for new users)

## Creating the First Admin

```bash
npx tsx server/src/scripts/create-admin.ts
```

## Key Files

- Server auth: `server/src/services/auth.ts`, `server/src/middleware/auth.ts`, `server/src/routes/auth.ts`
- Server users: `server/src/services/user.ts`, `server/src/routes/admin/users.ts`
- Schemas: `server/src/schemas/auth.ts`, `server/src/schemas/user.ts`
- Client auth: `client/src/lib/auth.tsx`, `client/src/lib/admin-api.ts`
- Client UI: `client/src/pages/admin/LoginPage.tsx`, `client/src/pages/admin/UsersPage.tsx`
- Hooks: `client/src/hooks/useUsers.ts`
