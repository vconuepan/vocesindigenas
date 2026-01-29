# Security Review: Authentication & Admin Endpoints

**Review Date:** 2026-01-29
**Overall Risk Level:** MEDIUM-HIGH

The auth mechanism has fundamental design weaknesses, admin endpoints lack rate limiting, and the crawl-URL feature introduces SSRF risk. However, many good practices are in place (Zod validation, Helmet headers, Prisma ORM, CORS config).

---

## Findings Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 3 |

---

## CRITICAL

### 1. Timing-unsafe API key comparison

**Location:** `server/src/middleware/auth.ts:23`
**Category:** Broken Authentication (OWASP A07:2021)

The `===` operator short-circuits on the first differing character, enabling timing attacks to recover the API key character by character.

**Remediation:** Use `crypto.timingSafeEqual()`:

```typescript
import { timingSafeEqual } from 'crypto'

const token = authHeader.slice(7)
const tokenBuf = Buffer.from(token)
const keyBuf = Buffer.from(apiKey)
if (tokenBuf.length !== keyBuf.length || !timingSafeEqual(tokenBuf, keyBuf)) {
  res.status(403).json({ error: 'Invalid credentials' })
  return
}
```

---

## HIGH

### 2. No rate limiting on admin endpoints

**Location:** `server/src/routes/admin/index.ts:10-20`, `server/src/app.ts:60`
**Category:** Broken Authentication / Brute Force (OWASP A07:2021)

Public routes have `apiLimiter`, but admin routes have none. Unlimited brute-force attempts against authentication are possible.

**Remediation:** Apply a strict rate limiter before `requireAdmin`:

```typescript
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

router.use(adminLimiter)
router.use(requireAdmin)
```

### 3. SSRF via crawl-url endpoint

**Location:** `server/src/services/extractor.ts:16-29`
**Category:** SSRF (OWASP A10:2021)

`/api/admin/stories/crawl-url` fetches any user-provided URL with no hostname validation. Could reach internal network, cloud metadata (`169.254.169.254`), or localhost services.

**Remediation:** Add URL validation to block private/internal addresses:

```typescript
function isAllowedUrl(urlStr: string): boolean {
  const url = new URL(urlStr)
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const hostname = url.hostname
  const blocked = [
    /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./, /^169\.254\./, /^0\./, /^::1$/, /^fc00:/i, /^fe80:/i,
    /\.internal$/i, /\.local$/i,
  ]
  return !blocked.some(re => re.test(hostname))
}
```

### 4. API key in localStorage (XSS exfiltration risk)

**Location:** `client/src/lib/auth.tsx:35`, `client/src/lib/admin-api.ts:26`
**Category:** Sensitive Data Exposure (OWASP A02:2021)

Any XSS vulnerability would allow exfiltration of the non-expiring admin key. Known tradeoff for the current static-key auth model.

**Remediation:** When upgrading auth:
1. Use `httpOnly` session cookies instead of Bearer tokens in localStorage
2. If Bearer tokens must be used, store in memory only with short-lived tokens and refresh token rotation
3. Add strict CSP to the frontend (currently only on API server)

### 5. Static API key with no expiration/rotation

**Location:** `server/src/middleware/auth.ts:8-29`
**Category:** Broken Authentication (OWASP A07:2021)

Single shared key, no per-user identity, no audit trail, no revocation mechanism without server restart.

**Remediation:**
1. Implement the `User` model already in the Prisma schema (with bcrypt/argon2 hashing)
2. Use JWT tokens with short expiration (15-30 min) and refresh tokens
3. Add audit logging with user identity on all mutating admin operations
4. Implement key rotation support

---

## MEDIUM

### 6. Info leakage in auth error response

**Location:** `server/src/middleware/auth.ts:12-13`
**Category:** Security Misconfiguration (OWASP A05:2021)

Returns `"Server misconfiguration: ADMIN_API_KEY not set"` to callers, revealing internal config details.

**Remediation:** Return generic `"Internal server error"` and log specifics server-side only.

### 7. No explicit JSON body size limit

**Location:** `server/src/app.ts:45`
**Category:** Denial of Service

`express.json()` is used without an explicit body size limit. Express defaults to 100kb but this should be explicit.

**Remediation:** `app.use(express.json({ limit: '100kb' }))`

### 8. Full error objects logged

**Location:** Multiple catch blocks across admin routes
**Category:** Insufficient Logging (OWASP A09:2021)

Catch blocks log entire error objects which may contain DB connection strings or query details.

**Remediation:** Log only `err.message` and stack traces, not full error objects.

### 9. CORS allows no-origin requests

**Location:** `server/src/app.ts:36-37`
**Category:** Security Misconfiguration (OWASP A05:2021)

Acceptable for Bearer token auth but must be revisited if switching to cookie-based sessions.

### 10. No path parameter validation

**Location:** All admin `/:id` route handlers
**Category:** Input Validation

`req.params.id` passed directly to Prisma without UUID format check. Safe due to Prisma ORM but violates defense-in-depth.

**Remediation:** Add UUID format validation middleware:

```typescript
const uuidParam = z.object({ id: z.string().uuid() })
```

---

## LOW

### 11. `expensiveOpLimiter` defined but never used

**Location:** `server/src/middleware/rateLimit.ts:20-28`
**Category:** Denial of Service / Resource Exhaustion

LLM-triggering endpoints (preassess, assess, select, generate) have no rate limiting. The limiter exists but isn't wired up.

**Remediation:** Apply `expensiveOpLimiter` to LLM-triggering endpoints.

### 12. Request logging doesn't mask sensitive headers

**Location:** `server/src/app.ts:48-56`

Currently safe (only logs method/URL) but fragile if additional logging is added.

### 13. Job name reflected in response

**Location:** `server/src/routes/admin/jobs.ts:65`

Safe due to whitelist check, noted for defense-in-depth.

---

## What's Done Well

- No hardcoded secrets -- all via `process.env`
- SQL injection prevention via Prisma ORM exclusively
- Zod schemas on all POST/PUT bodies and query params
- Helmet with CSP configured
- CORS with explicit origin whitelist
- Public API rate limiting
- Generic 500 error messages (no stack traces)
- Auth middleware applied at router level (not per-route)
- UUID primary keys prevent enumeration
- `.env` files gitignored

---

## Priority Fixes (Recommended Order)

1. **Timing-safe comparison** -- quickest, highest impact fix
2. **Admin rate limiting** -- apply before `requireAdmin` middleware
3. **SSRF protection** -- validate URLs against private/internal ranges
4. **Sanitize auth error message** -- return generic 500
5. **Explicit JSON body size limit** -- one-line change
6. **Apply `expensiveOpLimiter`** -- already defined, just needs wiring
7. **Path parameter validation** -- add UUID check middleware
8. **Sanitize logged error objects** -- log `err.message` only

---

## Future Work

1. **Implement User model** -- Prisma schema already has it with `passwordHash` and `UserRole`
2. **Audit logging** -- log all admin mutations with user identity
3. **CSRF protection** -- needed if switching to cookie-based sessions
4. **Frontend CSP** -- add via Render config or `_headers` file
5. **Dependency auditing in CI** -- ensure lockfiles committed and audited
