# Plan: Newsletter paywall con Reveniu

Created: 2026-05-05
Branch: main
Status: READY

## Objetivo

Habilitar el tier pagado del newsletter "Relacionamiento Indígena en Chile":
- Free: Píldora 2x/semana (lo que ya existe en impactoindigena.news)
- Paid: Edición dominical completa + cross-industry analysis LLM + archivo
- Precio: $5,990 CLP/mes · $59,900 CLP/año
- Procesador: Reveniu (Chilean, ~3.5% commission, recurring subscriptions API)
- Comunidades indígenas: acceso siempre gratuito (auto-declaración por honor)

Referencia: `venancio-main-design-20260505-215258.md` (APPROVED)

---

## Arquitectura

### Flujo completo

```
Usuario → /suscribir → redirect a Reveniu checkout
Reveniu procesa pago → webhook → POST /api/webhooks/reveniu
Webhook handler → upsert PaidSubscription → user tiene acceso paid
Domingo → newsletter job → query PaidSubscription activas → send full edition
```

### Decisión: PaidSubscription como modelo separado (no campo en User)

**Razón:** Phase 2 agrega tier corporativo ($200 USD/empresa). Un modelo separado maneja
ambos tiers sin tocar User. También permite historial de pagos, eventos de webhook,
y cancelaciones sin perder datos.

```prisma
model PaidSubscription {
  id                    String    @id @default(uuid())
  userId                String    @map("user_id")
  user                  User      @relation(fields: [userId], references: [id])
  reveniuCustomerId     String?   @map("reveniu_customer_id")
  reveniuSubscriptionId String?   @unique @map("reveniu_subscription_id")
  tier                  String    @default("individual")  // "individual" | "corporate"
  status                String    @default("active")       // "active" | "cancelled" | "expired"
  startedAt             DateTime  @map("started_at")
  renewsAt              DateTime? @map("renews_at")        // next billing date
  cancelledAt           DateTime? @map("cancelled_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@unique([userId])                                        // one active sub per user
  @@index([status, renewsAt])
  @@map("paid_subscriptions")
}
```

Add relation to User model:
```prisma
  paidSubscription      PaidSubscription?
```

---

## Archivos a crear/modificar

### 1. Database migration (SQL manual → user runs in pgAdmin)

`server/prisma/migrations/2026_05_05_add_paid_subscriptions/migration.sql`:
```sql
CREATE TABLE "paid_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "reveniu_customer_id" TEXT,
  "reveniu_subscription_id" TEXT UNIQUE,
  "tier" TEXT NOT NULL DEFAULT 'individual',
  "status" TEXT NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMPTZ NOT NULL,
  "renews_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "paid_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "paid_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "paid_subscriptions_user_id_key" ON "paid_subscriptions"("user_id");
CREATE UNIQUE INDEX "paid_subscriptions_reveniu_subscription_id_key"
  ON "paid_subscriptions"("reveniu_subscription_id");
CREATE INDEX "paid_subscriptions_status_renews_at_idx"
  ON "paid_subscriptions"("status", "renews_at");
```

### 2. Schema Prisma

`server/prisma/schema.prisma` — agregar modelo + relación a User (ver arriba).

### 3. Webhook endpoint

`server/src/routes/public/webhooks.ts` (nuevo archivo):

```typescript
// POST /api/webhooks/reveniu
// Reveniu sends webhook events for subscription lifecycle.
// Signature: X-Reveniu-Signature: sha256=<hmac-hex>
// Secret: REVENIU_WEBHOOK_SECRET env var

import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import prisma from '../../lib/prisma.js'
import { createLogger } from '../../lib/logger.js'

const router = Router()
const log = createLogger('webhooks:reveniu')

function verifySignature(payload: Buffer, signature: string): boolean {
  const secret = process.env.REVENIU_WEBHOOK_SECRET
  if (!secret) { log.error('REVENIU_WEBHOOK_SECRET not set'); return false }
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// Reveniu event types (confirmed with their docs):
// subscription.activated   → new paid subscriber
// subscription.renewed     → recurring payment succeeded
// subscription.cancelled   → subscriber cancelled (access until renewsAt)
// subscription.expired     → renewsAt passed without renewal

router.post('/reveniu', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-reveniu-signature'] as string
  if (!signature || !verifySignature(req.body as Buffer, signature)) {
    log.warn('invalid reveniu webhook signature')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const event = JSON.parse((req.body as Buffer).toString())
  const { type, data } = event

  log.info({ type, subscriptionId: data?.subscription?.id }, 'reveniu webhook received')

  try {
    await handleReveniuEvent(type, data)
    res.status(200).json({ ok: true })
  } catch (err) {
    log.error({ err, type }, 'reveniu webhook handler failed')
    res.status(500).json({ error: 'Handler failed' })
  }
})

async function handleReveniuEvent(type: string, data: any) {
  const { subscription, customer } = data
  const email = customer?.email?.toLowerCase()?.trim()
  if (!email) throw new Error('No customer email in Reveniu event')

  // Upsert user (may not exist if they checked out without prior magic link)
  const emailPrefix = email.split('@')[0]
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: emailPrefix,
      passwordHash: '',
      userType: 'VEEDOR',
      verified: true,
    },
  })

  if (type === 'subscription.activated' || type === 'subscription.renewed') {
    await prisma.paidSubscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        reveniuCustomerId: customer?.id,
        reveniuSubscriptionId: subscription?.id,
        tier: 'individual',
        status: 'active',
        startedAt: new Date(subscription?.startedAt ?? Date.now()),
        renewsAt: subscription?.renewsAt ? new Date(subscription.renewsAt) : null,
      },
      update: {
        status: 'active',
        reveniuCustomerId: customer?.id,
        reveniuSubscriptionId: subscription?.id,
        renewsAt: subscription?.renewsAt ? new Date(subscription.renewsAt) : null,
      },
    })
    log.info({ email, type }, 'paid subscription activated/renewed')
  }

  if (type === 'subscription.cancelled') {
    await prisma.paidSubscription.updateMany({
      where: { userId: user.id, status: 'active' },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        // Access until renewsAt (grace period preserved)
      },
    })
    log.info({ email }, 'paid subscription cancelled (access until renewsAt)')
  }

  if (type === 'subscription.expired') {
    await prisma.paidSubscription.updateMany({
      where: { userId: user.id },
      data: { status: 'expired' },
    })
    log.info({ email }, 'paid subscription expired')
  }
}

export default router
```

**Nota sobre raw body:** El webhook requiere `express.raw()` antes del JSON parser para validar HMAC.
Registrar esta ruta ANTES de `express.json()` en `app.ts`, o usar middleware condicional por path.

### 4. Helper: isPaidSubscriber

`server/src/services/subscription.ts` (nuevo):

```typescript
import prisma from '../lib/prisma.js'

export async function isPaidSubscriber(userId: string): Promise<boolean> {
  const sub = await prisma.paidSubscription.findUnique({
    where: { userId },
    select: { status: true, renewsAt: true },
  })
  if (!sub) return false
  if (sub.status === 'active') return true
  // Cancelled but within grace period (access until renewsAt)
  if (sub.status === 'cancelled' && sub.renewsAt && sub.renewsAt > new Date()) return true
  return false
}

export async function getPaidSubscriberEmails(): Promise<string[]> {
  const now = new Date()
  const subs = await prisma.paidSubscription.findMany({
    where: {
      OR: [
        { status: 'active' },
        { status: 'cancelled', renewsAt: { gt: now } },
      ],
    },
    include: { user: { select: { email: true } } },
  })
  return subs.map((s) => s.user.email)
}
```

### 5. Auth routes: paid subscription status

Agregar a `server/src/routes/auth.ts`:

```typescript
// GET /api/auth/paid-subscription
router.get('/paid-subscription', requireMember, async (req, res) => {
  const sub = await prisma.paidSubscription.findUnique({
    where: { userId: req.user!.userId },
    select: { status: true, tier: true, renewsAt: true, cancelledAt: true, startedAt: true },
  })
  const isPaid = sub?.status === 'active' ||
    (sub?.status === 'cancelled' && sub.renewsAt && sub.renewsAt > new Date())
  res.json({ isPaid: !!isPaid, subscription: sub ?? null })
})
```

### 6. Newsletter send: gate por tier

En `server/src/services/newsletter.ts`, la función de envío del newsletter dominical
debe:
1. Generar HTML full edition (con cross-industry analysis)
2. Obtener lista de suscriptores pagados via `getPaidSubscriberEmails()`
3. Enviar via Brevo usando lista filtrada o Brevo segment

**Estrategia Brevo:** Brevo list ID 2 = todos los confirmados (free). Para paid,
crear Brevo list ID 3 = suscriptores pagados. Al activar/cancelar Reveniu subscription,
sincronizar contact en Brevo con el list ID correcto.

O bien (más simple): enviar transaccional a cada email de `getPaidSubscriberEmails()`
via `brevo.sendTransactional()` en loop (válido hasta ~200 subs, luego usar campaña).

Recomendación para Phase 1 (< 100 subs): transaccional en loop. Refactorizar a
campaña Brevo cuando se superen 200.

### 7. Checkout redirect

`server/src/routes/public/reveniu.ts` (nuevo):

```typescript
// GET /api/subscribe/checkout
// Redirects to Reveniu checkout URL for individual tier.
// Optional: ?email=xxx pre-fills checkout
router.get('/checkout', (req, res) => {
  const base = process.env.REVENIU_CHECKOUT_URL
  if (!base) { res.status(503).json({ error: 'Checkout not configured' }); return }
  const url = new URL(base)
  const email = req.query.email as string | undefined
  if (email) url.searchParams.set('email', email)
  res.redirect(303, url.toString())
})
```

`REVENIU_CHECKOUT_URL` = URL de la suscripción en Reveniu (desde el panel de Reveniu
después de crear el plan de suscripción).

### 8. Frontend

**`client/src/pages/SubscribePage.tsx`** (nueva página en `/suscribir`):
- Hero: propuesta de valor del newsletter pagado
- Pricing card: $5,990 CLP/mes · $59,900 CLP/año
- CTA: botón → `window.location.href = '/api/subscribe/checkout'`
- Note: comunidades indígenas siempre gratis → link a formulario de honor

**`client/src/components/PaidBanner.tsx`** (nuevo):
- Banner inline para páginas del newsletter archive
- "Esta edición completa es solo para suscriptores. Suscríbete por $5,990/mes →"
- Solo visible si !isPaid

**Profile page** (`client/src/pages/ProfilePage.tsx`):
- Agregar sección "Tu suscripción" que consume `GET /api/auth/paid-subscription`
- Status: active / cancelled (con fecha fin de acceso) / no suscrito

---

## Variables de entorno nuevas

```
REVENIU_WEBHOOK_SECRET=<from Reveniu dashboard>
REVENIU_CHECKOUT_URL=https://app.reveniu.cl/checkout/plan/xxx
```

Agregar a `.env.example` y Render dashboard.

---

## Secuencia de implementación

Orden correcto para no romper nada:

1. **DB migration** — crear tabla `paid_subscriptions` (usuario corre en pgAdmin)
2. **Schema Prisma** — agregar modelo + `npm run db:generate --prefix server`
3. **`subscription.ts` service** — helper `isPaidSubscriber` + `getPaidSubscriberEmails`
4. **Webhook route** — `POST /api/webhooks/reveniu` con HMAC validation
5. **Auth route** — `GET /api/auth/paid-subscription`
6. **Checkout redirect** — `GET /api/subscribe/checkout`
7. **Registrar rutas** en `server/src/app.ts`
8. **Newsletter gate** — modificar send para two-tier
9. **Frontend** — `/suscribir` page + `PaidBanner` + profile section
10. **Configurar Reveniu** — crear plan, configurar webhook URL, obtener secret

---

## Tests requeridos

- `webhooks.test.ts`: signature validation (valid/invalid/missing), event routing
  (activated, cancelled, expired), email normalization, upsert idempotency
- `subscription.test.ts`: `isPaidSubscriber` grace period logic, expired case
- `auth.test.ts`: extend with paid-subscription endpoint tests

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Reveniu webhook fields no documentados | Testear con webhook de prueba de Reveniu antes de ir a prod; logging verboso |
| Raw body antes de JSON parser | Registrar route `/api/webhooks/reveniu` con `express.raw()` ANTES de `express.json()` global |
| Usuario paga pero no tiene cuenta | Webhook upserta User; magic link posterior conecta la misma cuenta por email |
| Escala de envío transaccional | Brevo transaccional OK hasta ~200; migrar a campaña/segment para Phase 2 |
| Acceso gratuito para comunidades | Flag `freeLicense: true` en User (ya existe en schema); `isPaidSubscriber` retorna true para freeLicense users |

---

## Nota sobre `freeLicense`

El campo `freeLicense: Boolean @default(false)` ya existe en el modelo `User`.
`isPaidSubscriber` debe también retornar `true` si `user.freeLicense === true`.
Esto implementa la promesa de acceso gratuito para comunidades indígenas sin
necesitar un subscription record.

Query actualizada:
```typescript
export async function isPaidSubscriber(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeLicense: true, paidSubscription: { select: { status: true, renewsAt: true } } },
  })
  if (!user) return false
  if (user.freeLicense) return true  // comunidades indígenas
  const sub = user.paidSubscription
  if (!sub) return false
  if (sub.status === 'active') return true
  if (sub.status === 'cancelled' && sub.renewsAt && sub.renewsAt > new Date()) return true
  return false
}
```

---

## Definition of Done

- [ ] Tabla `paid_subscriptions` en producción
- [ ] Webhook recibe evento test de Reveniu y crea PaidSubscription
- [ ] `GET /api/auth/paid-subscription` retorna status correcto
- [ ] `GET /api/subscribe/checkout` redirige a Reveniu
- [ ] Newsletter dominical llega solo a suscriptores pagados
- [ ] `/suscribir` page muestra pricing y CTA funcional
- [ ] `freeLicense` users pasan el gate sin subscription
- [ ] Tests del webhook pasan
