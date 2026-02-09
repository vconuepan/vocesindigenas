# Newsletter Subscription Enhancements

## Summary

Enhance the existing newsletter subscription flow with:
1. Optional first name field in the subscribe modal
2. Email verification via Plunk's `POST /v1/verify` before submission
3. A React context provider so any component can open the modal without prop drilling

## Current State

The full subscription flow already exists:
- `SubscribeModal` component with email-only form (`client/src/components/SubscribeModal.tsx`)
- `POST /api/subscribe` route with rate limiting and Zod validation (`server/src/routes/public/subscribe.ts`)
- Subscribe service: creates Plunk contact, stores `PendingSubscription`, sends confirmation email (`server/src/services/subscribe.ts`)
- Plunk integration with contact creation, transactional email, retry logic (`server/src/services/plunk.ts`)
- `PublicLayout` holds `subscribeOpen` state and passes it to SubscribeModal

## Decisions

- **Block** invalid/disposable emails (don't just warn)
- **SubscribeProvider** wraps PublicLayout only (admin doesn't need it)
- **Email verification** happens server-side in the subscribe service (single round-trip, no public key exposed)

## Changes

### 1. Subscribe Context Provider (client)

**File:** `client/src/components/SubscribeProvider.tsx` (new)

Create a `SubscribeContext` with `openSubscribe()` function and render the `SubscribeModal` inside the provider. This replaces the `subscribeOpen` state currently in `PublicLayout`.

```tsx
const SubscribeContext = createContext<{ openSubscribe: () => void }>({ openSubscribe: () => {} })
export const useSubscribe = () => useContext(SubscribeContext)
export function SubscribeProvider({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <SubscribeContext.Provider value={{ openSubscribe: () => setOpen(true) }}>
      {children}
      <SubscribeModal open={open} onClose={() => setOpen(false)} />
    </SubscribeContext.Provider>
  )
}
```

**File:** `client/src/layouts/PublicLayout.tsx` (modify)
- Remove `subscribeOpen` state and `<SubscribeModal>` render
- Wrap layout in `<SubscribeProvider>`
- Subscribe buttons call `useSubscribe().openSubscribe()` instead of `setSubscribeOpen(true)`

### 2. First Name Field (client + server)

**File:** `client/src/components/SubscribeModal.tsx`
- Add optional `firstName` text input above the email field
- Update `publicApi.subscribe()` call to pass `{ email, firstName }`

**File:** `client/src/lib/api.ts`
- Change `subscribe` method signature from `(email: string)` to `(data: { email: string; firstName?: string })`

**File:** `server/src/routes/public/subscribe.ts`
- Extend Zod schema: add `firstName: z.string().max(100).optional()`
- Pass `firstName` to `subscribeService.subscribe()`

**File:** `server/src/services/subscribe.ts`
- Accept `firstName` parameter
- Pass to Plunk `createContact` as `data: { firstName, pendingConfirmation: true }`
- Personalize confirmation email greeting if firstName provided ("Hi John," vs "Hi,")

### 3. Email Verification via Plunk (server)

**File:** `server/src/services/plunk.ts`
- Add `verifyEmail(email: string)` method calling `POST /v1/verify` with the secret key
- Return the verification result object

**File:** `server/src/services/subscribe.ts`
- Before creating the contact, call `plunk.verifyEmail(email)`
- Block if `valid === false` or `domainExists === false` — throw a typed `EmailValidationError`
- Block disposable emails (`isDisposable === true`)
- Wrap in try/catch so a Plunk API failure doesn't block subscription (graceful degradation — skip verification if Plunk is down)

**File:** `server/src/routes/public/subscribe.ts`
- Distinguish validation errors from other errors:
  - `EmailValidationError` → `{ success: false, message: "..." }` with user-facing message
  - Other errors → still return generic success (no information leak about existing accounts)

### 4. Client Error Handling

**File:** `client/src/components/SubscribeModal.tsx`
- Check response `success` field; if `false`, display the server's `message`
- Generic fallback for network/unexpected errors

## Files Modified

| File | Action |
|------|--------|
| `client/src/components/SubscribeProvider.tsx` | New — context provider |
| `client/src/components/SubscribeModal.tsx` | Modify — add firstName, error parsing |
| `client/src/layouts/PublicLayout.tsx` | Modify — use SubscribeProvider + useSubscribe |
| `client/src/lib/api.ts` | Modify — update subscribe signature |
| `server/src/routes/public/subscribe.ts` | Modify — schema + error responses |
| `server/src/services/subscribe.ts` | Modify — firstName param + email verification |
| `server/src/services/plunk.ts` | Modify — add verifyEmail method |

## Verification

1. Run `npm run build --prefix server` and `npm run build --prefix client` — no build errors
2. Run `npm run test --prefix server -- --run` and `npm run test --prefix client -- --run` — tests pass
3. Manual test with Playwright or browser:
   - Open site → click Subscribe in header → modal opens
   - Click newsletter link in footer → same modal opens
   - Submit with email only → success flow
   - Submit with email + first name → success flow
   - Submit with invalid/disposable email → error message shown
   - Close and reopen modal → form resets
