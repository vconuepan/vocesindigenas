# Security Posture Report — Impacto Indígena
**Date:** 2026-05-04  
**Scope:** Full platform audit (server + client + CI/CD + dependencies + LLM layer)  
**Method:** Static analysis across 14 CSO phases

---

## Executive Summary

The platform has a **strong security baseline**. No critical or high-severity findings. The architecture shows deliberate, informed security decisions: in-memory admin tokens, httpOnly cookies, helmet + CSP, comprehensive rate limiting, role-based access control applied at the router level, and SHA-pinned CI actions. Three low-severity issues and several informational notes are documented below.

**Overall rating: LOW RISK**

---

## Findings

### LOW-1 — `unsafe-inline` in Content Security Policy `styleSrc`

**File:** `server/src/app.ts`  
**Severity:** Low  
**Description:** Helmet's CSP is configured with `styleSrc: ["'self'", "'unsafe-inline'"]`. This permits inline `<style>` blocks anywhere on the page. If user-supplied data ever reaches a `style` attribute or `<style>` tag (e.g., via a future rich-text field), CSS injection becomes possible — which can leak data via CSS selectors and break visual integrity.  
**Current exposure:** No user-generated CSS renders today. Risk is forward-looking.  
**Recommendation:** Replace `'unsafe-inline'` with a nonce or hash for any legitimate inline styles. If Tailwind's JIT inlines styles, move to a build-time hash allowlist.

---

### LOW-2 — CSP removed entirely on the OG image route

**File:** `server/src/routes/og.ts` (line ~136)  
**Severity:** Low  
**Description:** `res.removeHeader('Content-Security-Policy')` is called for the OG image HTML page. The comment notes this is intentional for bot compatibility. Because this page is server-rendered and doesn't execute user-supplied scripts, the actual risk is minimal — but any XSS on this route has no CSP backstop.  
**Recommendation:** Instead of removing CSP entirely, apply a minimal CSP (`default-src 'none'; img-src 'self' data:`) appropriate for a static image-serving page.

---

### LOW-3 — `redirect_to` lacks URL-scheme validation

**File:** `server/src/routes/auth-public.ts` (line ~183)  
**Severity:** Low  
**Description:** The magic link verify handler takes `redirect_to` from query params and appends it to `CLIENT_URL`:

```ts
const redirectUrl = `${CLIENT_URL}${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`
```

This correctly prevents cross-origin redirects because `CLIENT_URL` anchors the domain (`https://impactoindigena.news`). However, if `targetPath` contains newline characters (`%0d%0a`), it could cause header injection in the `Location` header, depending on how Express serializes it.  
**Recommendation:** Sanitize `redirect_to` to strip newlines and null bytes before use:
```ts
const cleanPath = (redirect_to ?? '/').replace(/[\r\n\0]/g, '').trim()
const targetPath = cleanPath.startsWith('/') ? cleanPath : '/'
```

---

## Positive Findings (Security Controls Working Well)

| Control | Status |
|---|---|
| Admin JWT access token — in-memory (XSS-safe, never localStorage) | ✅ |
| Refresh token — httpOnly cookie, `secure` in prod, path-scoped to `/api/auth` | ✅ |
| Role-based access control — `requireAuth + requireRole('admin', 'editor')` on entire admin router | ✅ |
| Rate limiting — authLimiter (5/15min), magicLinkLimiter, searchLimiter, apiLimiter, subscribeLimiter, feedbackLimiter | ✅ |
| CORS — public GET endpoints open (`*`), all auth/admin restricted to allowlisted origins | ✅ |
| `trust proxy: 1` — correct for Render.com; prevents IP spoofing in rate limits | ✅ |
| Helmet — CSP configured; `crossOriginEmbedderPolicy: false` only (needed for embeds) | ✅ |
| No SQL injection surface — all web-facing queries use Prisma ORM; `$queryRawUnsafe` only in offline scripts | ✅ |
| No secrets in git history — `sk-...` in old commit is `.env.sample` placeholder, not real key | ✅ |
| Dependencies — 11 moderate CVEs (uuid via langchain/node-cron), no high/critical, no exploitable path | ✅ |
| CI/CD — all GitHub Actions SHA-pinned, gitleaks scanning active, no `pull_request_target` | ✅ |
| LLM structured output — all LLM calls use `withStructuredOutput(zodSchema)`; prompt injection constrained by schema | ✅ |
| Search embeddings — user query flows to OpenAI for vectorization only; no instruction-following risk | ✅ |
| StructuredData JSON-LD — `JSON.stringify` + `</script>` escape prevents script tag injection | ✅ |
| ObfuscatedAddress — uses DOM `append()` with text nodes, not `innerHTML` | ✅ |
| API key comparison — `timingSafeEqual` with constant-length buffer (no timing leak) | ✅ |
| Magic link tokens — prefix-only in logs (`token?.slice(0, 8)`); full token never logged | ✅ |

---

## Informational Notes

**LLM prompt injection via story content:** Story titles and summaries are passed to editorial/newsletter generation prompts. An attacker who controls a published story (only admins can publish) could craft a title like "Ignore previous instructions and...". The structured output constraint (`withStructuredOutput`) limits damage to title/content fields. No external attacker path exists since stories come from RSS feeds parsed by the server and require admin publication approval.

**SSRF via feed URLs:** `rssParser.ts` fetches arbitrary URLs from the `feeds` table. Feed URLs are admin-configured — no user-facing endpoint accepts a crawl URL. SSRF is a theoretical concern only if admin credentials are compromised.

**Email addresses in operational logs:** Auth events log `email` at info level (login, magic link send/verify). This is standard operational practice. Ensure log aggregation (Pino/Render) has appropriate retention policies and access controls.

**`$executeRawUnsafe` in scripts:** Found in `scripts/seed-communities.ts` and `scripts/migrations/backfill-emotion-tag.ts`. These are offline developer scripts, not web-facing. No injection risk.

---

## Recommended Actions (Priority Order)

1. **[LOW-3]** Sanitize `redirect_to` header injection — 10-minute fix, zero risk
2. **[LOW-1]** Replace `unsafe-inline` styleSrc with nonce/hash — medium effort, good hygiene
3. **[LOW-2]** Apply minimal CSP on OG route instead of removing it — 15-minute fix
4. **[INFO]** Add `redirect_to` to a Zod schema validation at the route level for consistency with the rest of the codebase

---

*Audit performed via static analysis. No dynamic testing or penetration testing was conducted.*
