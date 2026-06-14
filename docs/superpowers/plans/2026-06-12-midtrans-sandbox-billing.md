# Midtrans Sandbox Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Midtrans Snap sandbox one-time payments as WebWeave's default checkout path with 30/365-day paid access expiry.

**Architecture:** Keep existing LemonSqueezy files but stop using them from the default checkout API. Add a focused Midtrans helper for config, Snap transaction creation, signature verification, and entitlement mapping. Reuse the existing pricing UI contract (`checkoutUrl`) and add a Midtrans webhook route that updates Supabase profile entitlements.

**Tech Stack:** Next.js App Router API routes, Supabase service role client, Midtrans Snap HTTP API, Node `crypto`, source verification scripts, existing pricing modal.

---

## File Map

- Create `src/lib/billing/midtrans.js`: Midtrans config, price lookup integration, Snap transaction creation, webhook signature verification, status mapping, entitlement mapping.
- Modify `src/lib/billing/plans.js`: add Midtrans price values and exported `getPlanPrice(planId, billingCycle)` helper.
- Modify `src/app/api/billing/checkout/route.js`: replace LemonSqueezy default checkout call with Midtrans Snap checkout call.
- Create `src/app/api/billing/midtrans/webhook/route.js`: verify Midtrans notification signature and update `profiles`.
- Create `supabase/migrations/003_midtrans_billing_profiles.sql`: add Midtrans metadata and entitlement expiry profile fields.
- Modify `src/app/api/generate/route.js`: enforce Free quota when `billing_period_ends_at` is expired.
- Modify `.env.local.example`: add Midtrans sandbox env placeholders.
- Modify `src/components/PricingPage.js`: change user-facing checkout copy from LemonSqueezy to Midtrans.
- Create `scripts/verify-midtrans-integration.mjs`: source-level verification for the integration.
- Modify `README.md`: add short Midtrans sandbox setup notes.

Commits are intentionally not part of this plan because this OpenCode session must not commit unless the user explicitly asks.

---

### Task 1: Add Failing Midtrans Verification Script

**Files:**
- Create: `scripts/verify-midtrans-integration.mjs`

- [ ] **Step 1: Write the failing verification script**

Create `scripts/verify-midtrans-integration.mjs` with this content:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectations = [
  ['Midtrans helper exists', 'src/lib/billing/midtrans.js', null],
  ['Midtrans helper exports getMidtransConfig', 'src/lib/billing/midtrans.js', 'export function getMidtransConfig'],
  ['Midtrans helper exports createMidtransSnapCheckout', 'src/lib/billing/midtrans.js', 'export async function createMidtransSnapCheckout'],
  ['Midtrans helper exports verifyMidtransSignature', 'src/lib/billing/midtrans.js', 'export function verifyMidtransSignature'],
  ['Midtrans helper exports mapMidtransNotificationToEntitlement', 'src/lib/billing/midtrans.js', 'export function mapMidtransNotificationToEntitlement'],
  ['Midtrans sandbox endpoint exists', 'src/lib/billing/midtrans.js', 'https://app.sandbox.midtrans.com/snap/v1/transactions'],
  ['Midtrans production endpoint exists', 'src/lib/billing/midtrans.js', 'https://app.midtrans.com/snap/v1/transactions'],
  ['Midtrans helper uses Basic auth', 'src/lib/billing/midtrans.js', 'Authorization: `Basic ${authToken}`'],
  ['Midtrans signature uses sha512', 'src/lib/billing/midtrans.js', "createHash('sha512')"],
  ['Midtrans signature uses order id', 'src/lib/billing/midtrans.js', 'order_id'],
  ['Midtrans signature uses status code', 'src/lib/billing/midtrans.js', 'status_code'],
  ['Midtrans signature uses gross amount', 'src/lib/billing/midtrans.js', 'gross_amount'],
  ['Plans expose price helper', 'src/lib/billing/plans.js', 'export function getPlanPrice'],
  ['Starter monthly Midtrans price', 'src/lib/billing/plans.js', 'monthly: 49000'],
  ['Starter annual Midtrans price', 'src/lib/billing/plans.js', 'annual: 470000'],
  ['Pro monthly Midtrans price', 'src/lib/billing/plans.js', 'monthly: 129000'],
  ['Pro annual Midtrans price', 'src/lib/billing/plans.js', 'annual: 1238000'],
  ['Checkout route imports Midtrans', 'src/app/api/billing/checkout/route.js', 'createMidtransSnapCheckout'],
  ['Midtrans webhook route exists', 'src/app/api/billing/midtrans/webhook/route.js', null],
  ['Midtrans webhook verifies signature', 'src/app/api/billing/midtrans/webhook/route.js', 'verifyMidtransSignature'],
  ['Midtrans webhook updates profiles', 'src/app/api/billing/midtrans/webhook/route.js', ".from('profiles')"],
  ['Migration adds billing provider', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_provider text'],
  ['Migration adds billing expiry', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'billing_period_ends_at timestamptz'],
  ['Migration adds Midtrans order ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_order_id text'],
  ['Migration adds Midtrans transaction ID', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_transaction_id text'],
  ['Migration adds Midtrans status', 'supabase/migrations/003_midtrans_billing_profiles.sql', 'midtrans_status text'],
  ['Env has Midtrans server key', '.env.local.example', 'MIDTRANS_SERVER_KEY='],
  ['Env has Midtrans client key', '.env.local.example', 'NEXT_PUBLIC_MIDTRANS_CLIENT_KEY='],
  ['Env has Midtrans sandbox flag', '.env.local.example', 'MIDTRANS_IS_PRODUCTION=false'],
  ['Generate route reads billing expiry', 'src/app/api/generate/route.js', 'billing_period_ends_at'],
  ['Pricing copy mentions Midtrans', 'src/components/PricingPage.js', 'Redirecting to Midtrans checkout...'],
];

const missing = expectations.filter(([, path, token]) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return true;
  if (!token) return false;
  return !read(path).includes(token);
});

if (missing.length) {
  console.error('Midtrans integration verification failed:');
  for (const [label, path, token] of missing) {
    console.error(`- ${label}: ${path}${token ? ` missing "${token}"` : ' missing file'}`);
  }
  process.exit(1);
}

console.log('Midtrans integration verification passed.');
```

- [ ] **Step 2: Run verification and confirm RED**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: fails with missing Midtrans helper, webhook route, migration, env tokens, and route changes.

---

### Task 2: Add Midtrans Plan Prices And Migration

**Files:**
- Modify: `src/lib/billing/plans.js`
- Create: `supabase/migrations/003_midtrans_billing_profiles.sql`
- Modify: `.env.local.example`

- [ ] **Step 1: Update plan price source of truth**

In `src/lib/billing/plans.js`, add `midtransPrices` to Starter and Pro. Keep Team disabled.

Expected shape:

```js
starter: {
  id: 'starter',
  label: 'Starter',
  monthlyGenerationLimit: 500,
  checkoutEnabled: true,
  midtransPrices: {
    monthly: 49000,
    annual: 470000,
  },
  variants: {
    monthly: 'LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID',
    annual: 'LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID',
  },
},
pro: {
  id: 'pro',
  label: 'Pro',
  monthlyGenerationLimit: 2000,
  checkoutEnabled: true,
  midtransPrices: {
    monthly: 129000,
    annual: 1238000,
  },
  variants: {
    monthly: 'LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
    annual: 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
  },
},
```

Add this exported helper at the end of the file:

```js
export function getPlanPrice(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  return Number(plan?.midtransPrices?.[cycle] || 0);
}
```

- [ ] **Step 2: Add Midtrans profile migration**

Create `supabase/migrations/003_midtrans_billing_profiles.sql`:

```sql
-- Midtrans billing metadata and one-time payment entitlement expiry.

alter table public.profiles
add column if not exists billing_provider text,
add column if not exists billing_period_ends_at timestamptz,
add column if not exists midtrans_order_id text,
add column if not exists midtrans_transaction_id text,
add column if not exists midtrans_status text;

create index if not exists profiles_billing_provider_idx on public.profiles(billing_provider);
create index if not exists profiles_billing_period_ends_at_idx on public.profiles(billing_period_ends_at);
create index if not exists profiles_midtrans_order_id_idx on public.profiles(midtrans_order_id);
create index if not exists profiles_midtrans_transaction_id_idx on public.profiles(midtrans_transaction_id);
```

- [ ] **Step 3: Add Midtrans env placeholders**

In `.env.local.example`, insert after LemonSqueezy entries or before `NEXT_PUBLIC_APP_URL`:

```text
# =============================================
# WebWeave — Midtrans Billing Sandbox
# =============================================
# Use Midtrans sandbox keys first. Notification URL example:
# https://<ngrok-id>.ngrok-free.app/api/billing/midtrans/webhook

MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 4: Run verification and confirm remaining failures shrink**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: plan prices, migration, and env checks pass; helper/route/webhook/generate/UI checks still fail.

---

### Task 3: Implement Midtrans Billing Helper

**Files:**
- Create: `src/lib/billing/midtrans.js`

- [ ] **Step 1: Create helper file**

Create `src/lib/billing/midtrans.js`:

```js
import crypto from 'node:crypto';
import { getPlanConfig, getPlanPrice, normalizeBillingCycle } from './plans';

const MIDTRANS_SNAP_SANDBOX_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_SNAP_PRODUCTION_URL = 'https://app.midtrans.com/snap/v1/transactions';
const ACTIVE_STATUSES = new Set(['settlement', 'capture']);
const INACTIVE_STATUSES = new Set(['expire', 'cancel', 'deny', 'failure']);

export function getMidtransConfig(env = process.env) {
  const serverKey = env.MIDTRANS_SERVER_KEY || '';
  const clientKey = env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';

  return {
    serverKey,
    clientKey,
    appUrl,
    isProduction,
    snapUrl: isProduction ? MIDTRANS_SNAP_PRODUCTION_URL : MIDTRANS_SNAP_SANDBOX_URL,
    checkoutConfigured: Boolean(serverKey),
  };
}

function buildOrderId(userId, planId, billingCycle, now = new Date()) {
  const userPrefix = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'user';
  const timestamp = now.getTime();
  return `ww_${userPrefix}_${planId}_${billingCycle}_${timestamp}`;
}

function getCustomerName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'WebWeave User';
}

export async function createMidtransSnapCheckout({ planId, billingCycle, user, env = process.env }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getMidtransConfig(env);
  const grossAmount = getPlanPrice(planId, cycle);

  if (!plan?.checkoutEnabled) {
    return { success: false, configured: config.checkoutConfigured, error: 'This plan is not available for checkout.' };
  }

  if (!config.checkoutConfigured || !grossAmount) {
    return { success: false, configured: false, error: 'Payment gateway is not configured yet.' };
  }

  const orderId = buildOrderId(user.id, plan.id, cycle);
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  const response = await fetch(config.snapUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${authToken}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: getCustomerName(user),
        email: user.email || '',
      },
      item_details: [
        {
          id: `webweave_${plan.id}_${cycle}`,
          price: grossAmount,
          quantity: 1,
          name: `WebWeave ${plan.label} ${cycle}`,
        },
      ],
      callbacks: {
        finish: config.appUrl,
      },
      custom_field1: user.id,
      custom_field2: plan.id,
      custom_field3: cycle,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Midtrans checkout error:', payload);
    return { success: false, configured: true, error: payload?.error_messages?.[0] || 'Failed to create checkout.' };
  }

  if (!payload?.redirect_url) {
    return { success: false, configured: true, error: 'Checkout URL was not returned.' };
  }

  return { success: true, configured: true, checkoutUrl: payload.redirect_url, orderId, token: payload.token };
}

export function verifyMidtransSignature(notification, serverKey) {
  const orderId = String(notification?.order_id || '');
  const statusCode = String(notification?.status_code || '');
  const grossAmount = String(notification?.gross_amount || '');
  const received = String(notification?.signature_key || '');

  if (!orderId || !statusCode || !grossAmount || !received || !serverKey) return false;

  const digest = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  return digest === received;
}

export function getBillingPeriodEndIso(billingCycle, now = new Date()) {
  const days = normalizeBillingCycle(billingCycle) === 'annual' ? 365 : 30;
  const end = new Date(now.getTime());
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString();
}

export function mapMidtransNotificationToEntitlement(notification) {
  const transactionStatus = String(notification?.transaction_status || '').toLowerCase();
  const fraudStatus = String(notification?.fraud_status || '').toLowerCase();
  const planId = String(notification?.custom_field2 || '').toLowerCase();
  const billingCycle = normalizeBillingCycle(String(notification?.custom_field3 || '').toLowerCase());
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const captureAccepted = transactionStatus === 'capture' && (!fraudStatus || fraudStatus === 'accept');
  const active = transactionStatus === 'settlement' || captureAccepted;
  const inactive = INACTIVE_STATUSES.has(transactionStatus);

  return {
    userId: String(notification?.custom_field1 || ''),
    orderId: notification?.order_id ? String(notification.order_id) : null,
    transactionId: notification?.transaction_id ? String(notification.transaction_id) : null,
    status: transactionStatus || 'unknown',
    active,
    inactive,
    planId: active ? plan.id : 'free',
    monthlyGenerationLimit: active ? plan.monthlyGenerationLimit : getPlanConfig('free').monthlyGenerationLimit,
    billingCycle: active ? billingCycle : 'monthly',
    billingPeriodEndsAt: active ? getBillingPeriodEndIso(billingCycle) : null,
  };
}
```

- [ ] **Step 2: Run verification and confirm helper checks pass**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: helper checks pass; checkout/webhook/generate/UI checks still fail.

---

### Task 4: Wire Checkout Route And Pricing Copy To Midtrans

**Files:**
- Modify: `src/app/api/billing/checkout/route.js`
- Modify: `src/components/PricingPage.js`

- [ ] **Step 1: Update checkout route imports and call**

Replace LemonSqueezy import in `src/app/api/billing/checkout/route.js`:

```js
import { createMidtransSnapCheckout } from '@/lib/billing/midtrans';
```

Replace the checkout call:

```js
const checkout = await createMidtransSnapCheckout({ planId, billingCycle, user: auth.user });
```

Leave response shape unchanged:

```js
return NextResponse.json({ success: true, checkoutUrl: checkout.checkoutUrl });
```

- [ ] **Step 2: Update pricing user-facing copy**

In `src/components/PricingPage.js`, change initial action message:

```js
const [actionMessage, setActionMessage] = useState('Pilih paket untuk checkout. Midtrans sandbox bisa diaktifkan dari env.');
```

Change redirect message:

```js
setActionMessage('Redirecting to Midtrans checkout...');
```

- [ ] **Step 3: Run verification and confirm checkout/UI checks pass**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: checkout route and pricing copy checks pass; webhook/generate checks still fail.

---

### Task 5: Add Midtrans Webhook Route

**Files:**
- Create: `src/app/api/billing/midtrans/webhook/route.js`

- [ ] **Step 1: Create webhook route**

Create `src/app/api/billing/midtrans/webhook/route.js`:

```js
import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getMidtransConfig, mapMidtransNotificationToEntitlement, verifyMidtransSignature } from '@/lib/billing/midtrans';

export async function POST(req) {
  const notification = await req.json().catch(() => null);
  const config = getMidtransConfig();

  if (!notification) {
    return NextResponse.json({ success: false, error: 'Invalid notification payload.' }, { status: 400 });
  }

  if (!config.checkoutConfigured) {
    return NextResponse.json({ success: false, error: 'Payment gateway is not configured yet.' }, { status: 503 });
  }

  if (!verifyMidtransSignature(notification, config.serverKey)) {
    return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
  }

  const entitlement = mapMidtransNotificationToEntitlement(notification);
  if (!entitlement.userId) {
    return NextResponse.json({ success: false, error: 'Webhook missing user_id custom data.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const update = entitlement.active
    ? {
        plan: entitlement.planId,
        monthly_generation_limit: entitlement.monthlyGenerationLimit,
        billing_cycle: entitlement.billingCycle,
        billing_provider: 'midtrans',
        billing_period_ends_at: entitlement.billingPeriodEndsAt,
        midtrans_order_id: entitlement.orderId,
        midtrans_transaction_id: entitlement.transactionId,
        midtrans_status: entitlement.status,
        billing_updated_at: new Date().toISOString(),
      }
    : {
        midtrans_order_id: entitlement.orderId,
        midtrans_transaction_id: entitlement.transactionId,
        midtrans_status: entitlement.status,
        billing_updated_at: new Date().toISOString(),
      };

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', entitlement.userId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: entitlement.status, plan: entitlement.active ? entitlement.planId : undefined });
}
```

- [ ] **Step 2: Run verification and confirm webhook checks pass**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: webhook checks pass; generate expiry check still fails.

---

### Task 6: Enforce Expired One-Time Payment As Free Quota

**Files:**
- Modify: `src/app/api/generate/route.js`

- [ ] **Step 1: Add expiry helper near quota helpers**

Add after `getMonthStartIso()`:

```js
function isBillingExpired(profile) {
  if (!profile?.billing_period_ends_at) return false;
  const expiresAt = new Date(profile.billing_period_ends_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}
```

- [ ] **Step 2: Select expiry column and compute effective limit**

Change profile select in `checkUserGenerationQuota(req)` from:

```js
.select('plan, monthly_generation_limit')
```

to:

```js
.select('plan, monthly_generation_limit, billing_period_ends_at')
```

Change limit calculation from:

```js
const limit = Number(profile?.monthly_generation_limit || 30);
```

to:

```js
const billingExpired = isBillingExpired(profile);
const limit = billingExpired ? 30 : Number(profile?.monthly_generation_limit || 30);
```

- [ ] **Step 3: Return expiry context for diagnostics**

Change allowed return from:

```js
return { allowed: true, auth, used, limit };
```

to:

```js
return { allowed: true, auth, used, limit, billingExpired };
```

- [ ] **Step 4: Run verification and confirm all Midtrans checks pass**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: `Midtrans integration verification passed.`

---

### Task 7: Add README Midtrans Sandbox Notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add short Midtrans section near billing docs**

Add this section after the LemonSqueezy setup notes or billing section:

```md
### Optional Midtrans Sandbox Billing Setup

Midtrans Snap can be used as the default sandbox checkout while LemonSqueezy is unavailable.

1. Create or open a Midtrans sandbox account.
2. Copy the sandbox Server Key into `MIDTRANS_SERVER_KEY`.
3. Copy the sandbox Client Key into `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.
4. Keep `MIDTRANS_IS_PRODUCTION=false` for sandbox.
5. Expose local webhook with `ngrok http 3000`.
6. Set the Midtrans payment notification URL to `https://<ngrok-id>.ngrok-free.app/api/billing/midtrans/webhook`.
7. Click Starter or Pro from the pricing modal and use Midtrans sandbox payment credentials.

Successful `settlement` or accepted `capture` notifications upgrade the user profile until `billing_period_ends_at`.
```

- [ ] **Step 2: Run source verification**

Run all source verification scripts:

```powershell
node scripts/verify-midtrans-integration.mjs
node scripts/verify-billing-integration.mjs
node scripts/verify-pricing-page.mjs
node scripts/verify-generate-guardrails.mjs
```

Expected:

```text
Midtrans integration verification passed.
Billing integration verification passed.
Pricing page verification passed.
Generate guardrail verification passed.
```

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next.js build completes successfully and lists `/api/billing/midtrans/webhook` among routes.

---

## Manual Sandbox Test Checklist

- [ ] Apply `supabase/migrations/003_midtrans_billing_profiles.sql` in Supabase SQL editor.
- [ ] Fill `.env.local` with `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`, and `NEXT_PUBLIC_APP_URL`.
- [ ] Restart local dev server.
- [ ] Run `ngrok http 3000`.
- [ ] Set Midtrans sandbox notification URL to `https://<ngrok-id>.ngrok-free.app/api/billing/midtrans/webhook`.
- [ ] Log in to WebWeave.
- [ ] Click Starter monthly.
- [ ] Complete sandbox payment.
- [ ] Confirm `profiles.plan = starter`.
- [ ] Confirm `profiles.monthly_generation_limit = 500`.
- [ ] Confirm `profiles.billing_provider = midtrans`.
- [ ] Confirm `profiles.billing_period_ends_at` is around 30 days from payment time.
- [ ] Generate until quota check sees paid limit.
