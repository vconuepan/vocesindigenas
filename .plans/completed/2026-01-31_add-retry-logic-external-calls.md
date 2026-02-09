# Plan: Issue 8 — Retry Logic for External Calls

**Improvement:** #8 from `improvements.md`
**Priority:** HIGH / Reliability

## Problem

LLM calls, RSS feed parsing, and HTTP content extraction have zero retry logic. Transient errors (429, 503, network timeouts) immediately fail the operation.

## Approach

- **LLM calls**: Use LangChain's built-in retry middleware (`.withRetry()` on the model) for retries with exponential backoff. This is the idiomatic LangChain approach.
- **RSS/HTTP calls**: Create a small `withRetry()` utility for non-LLM external calls.

## Steps

1. **LLM retries via LangChain middleware in `services/llm.ts`:**
   ```typescript
   export function getSmallLLM(): ChatOpenAI {
     const llm = new ChatOpenAI({ ... })
     return llm.withRetry({ stopAfterAttempt: 3 })
   }
   ```
   This retries on all errors including 429 and 5xx with exponential backoff.

2. **Create `server/src/lib/retry.ts`** for non-LLM calls:
   ```typescript
   export async function withRetry<T>(
     fn: () => Promise<T>,
     options?: { retries?: number; baseDelayMs?: number; retryOn?: (err: unknown) => boolean }
   ): Promise<T>
   ```
   - Default: 3 retries, exponential backoff (1s, 2s, 4s)
   - `retryOn` predicate to filter which errors trigger retry

3. **Apply to RSS parsing in `services/rssParser.ts`:**
   - Wrap `parser.parseURL()` with `withRetry`
   - Retry on network errors

4. **Apply to HTTP fetch in `services/extractor.ts`:**
   - Wrap `axios.get()` in `fetchPage` with `withRetry`
   - Retry on 5xx and network errors

5. **Apply to PipFeed API call:**
   - Wrap `axios.post()` in `extractByPipfeed` with `withRetry`

6. **Add unit tests** for `withRetry` utility.

## Files Changed

- `server/src/services/llm.ts` — add `.withRetry()` to LLM instances
- `server/src/lib/retry.ts` — new file for non-LLM retries
- `server/src/services/rssParser.ts` — wrap parse call
- `server/src/services/extractor.ts` — wrap fetch calls

## Decisions

- **Q8.1**: Exponential backoff, 3 retries, 1s/2s/4s delays ✓
- **Q8.2**: LangChain middleware for LLM, custom utility for RSS/HTTP ✓
- **Q8.3**: Retry on 429, 5xx, and network timeouts ✓

## Risks

- LangChain's `.withRetry()` may not be available on all model types. Need to verify with `ChatOpenAI`.
- Retries add latency but are bounded by the retry count.
