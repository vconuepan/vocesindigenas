# Plan: Issue 7 — Global Express Error Handler

**Improvement:** #7 from `improvements.md`
**Priority:** HIGH / Reliability

## Problem

There is no Express error-handling middleware in `app.ts`. If a middleware or route handler throws synchronously, Express returns its default HTML 500 page with stack traces instead of a JSON response.

## Approach

Add a 4-parameter error handler as the last middleware in `app.ts`. Optionally add an async wrapper for route handlers.

## Steps

1. **Add error handler to `app.ts` after all routes:**
   ```typescript
   app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
     log.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error')
     res.status(500).json({ error: 'Internal server error' })
   })
   ```

2. **Add a 404 handler before the error handler:**
   ```typescript
   app.use((_req, res) => {
     res.status(404).json({ error: 'Not found' })
   })
   ```

3. **Optionally add `express-async-errors`** or a wrapper function to catch async rejections and forward them to the error handler.

## Files Changed

- `server/src/app.ts` — add error handler and 404 handler

## Decisions

- **Q7.1**: Generic "Internal server error" in production (no error message leak) ✓
- **Q7.2**: Install `express-async-errors` for automatic async wrapping ✓

## Risks

- None. This is purely additive and doesn't change existing behavior for working routes.
