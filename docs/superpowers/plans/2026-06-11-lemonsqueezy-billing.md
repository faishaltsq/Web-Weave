# LemonSqueezy Billing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build env-safe LemonSqueezy checkout and webhook billing for WebWeave Starter/Pro plans, with env variables left blank until LemonSqueezy validation is complete.

**Architecture:** Browser pricing CTAs call a WebWeave billing checkout API. The server creates LemonSqueezy checkouts and passes Supabase user metadata through `checkout_data.custom`. LemonSqueezy signed webhooks update Supabase profile entitlements; `/api/generate` enforces monthly quota from `profiles.monthly_generation_limit`.

**Tech Stack:** Next.js 14 App Router, React 18, CSS Modules, Supabase service role, LemonSqueezy JSON:API, Node `crypto` HMAC SHA256, source verification scripts.

---

## File Structure

- Create: `src/lib/billing/plans.js`
  - Single source of truth for plans, limits, billing cycles, and LemonSqueezy variant env mapping.
- Create: `src/lib/billing/lemonsqueezy.js`
  - Reads billing env, creates LemonSqueezy checkout requests, verifies webhook signatures, maps webhook payloads to WebWeave entitlements.
- Create: `src/app/api/billing/checkout/route.js`
  - Authenticated endpoint that creates checkout URLs for Starter/Pro.
- Create: `src/app/api/billing/webhook/route.js`
  - Public endpoint that verifies LemonSqueezy signatures and updates Supabase profiles.
- Create: `supabase/migrations/002_billing_profiles.sql`
  - Adds LemonSqueezy billing metadata columns to `public.profiles`.
- Create: `scripts/verify-billing-integration.mjs`
  - Lightweight verification for required files, env names, routes, signature verification, and UI wiring.
- Modify: `.env.local.example`
  - Adds blank LemonSqueezy env entries.
- Modify: `src/components/PricingPage.js`
  - Changes Starter/Pro CTAs from mock-only to checkout attempts while keeping friendly fallback messages.
- Modify: `src/app/page.js`
  - Passes authenticated checkout handler into `PricingPage`.
- Modify: `src/app/api/generate/route.js`
  - Enforces authenticated monthly generation quota when Supabase auth is available.
- Modify: `README.md`
  - Adds LemonSqueezy setup tutorial and callback URL notes.

---

### Task 1: Billing Plan Source Of Truth And Verification

**Files:**
- Create: `scripts/verify-billing-integration.mjs`
- Create: `src/lib/billing/plans.js`

- [ ] **Step 1: Write failing verification script**

Create `scripts/verify-billing-integration.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), 'utf8');

const expectations = [
  ['billing plan helper exists', 'src/lib/billing/plans.js', null],
  ['checkout route exists', 'src/app/api/billing/checkout/route.js', null],
  ['webhook route exists', 'src/app/api/billing/webhook/route.js', null],
  ['billing migration exists', 'supabase/migrations/002_billing_profiles.sql', null],
  ['plan helper exports Starter limit', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 500'],
  ['plan helper exports Pro limit', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 2000'],
  ['plan helper disables Team checkout', 'src/lib/billing/plans.js', 'checkoutEnabled: false'],
  ['Starter monthly env mapped', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID'],
  ['Pro annual env mapped', 'src/lib/billing/plans.js', 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID'],
];

const missing = expectations.filter(([, path, token]) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return true;
  if (!token) return false;
  return !read(path).includes(token);
});

if (missing.length) {
  console.error('Billing integration verification failed:');
  for (const [label, path, token] of missing) {
    console.error(`- ${label}: ${path}${token ? ` missing "${token}"` : ' missing file'}`);
  }
  process.exit(1);
}

console.log('Billing integration verification passed.');
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL listing missing `src/lib/billing/plans.js`, checkout route, webhook route, and migration.

- [ ] **Step 3: Add plan helper**

Create `src/lib/billing/plans.js`:

```js
export const BILLING_CYCLES = ['monthly', 'annual'];

export const WEBWEAVE_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyGenerationLimit: 30,
    checkoutEnabled: false,
    variants: {},
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyGenerationLimit: 500,
    checkoutEnabled: true,
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
    variants: {
      monthly: 'LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
      annual: 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyGenerationLimit: 8000,
    checkoutEnabled: false,
    variants: {},
  },
};

export function normalizeBillingCycle(value) {
  return BILLING_CYCLES.includes(value) ? value : 'monthly';
}

export function getPlanConfig(planId) {
  return WEBWEAVE_PLANS[planId] || null;
}

export function getVariantEnvName(planId, billingCycle) {
  const plan = getPlanConfig(planId);
  if (!plan?.checkoutEnabled) return null;
  return plan.variants[normalizeBillingCycle(billingCycle)] || null;
}

export function getPlanLimit(planId) {
  return getPlanConfig(planId)?.monthlyGenerationLimit || WEBWEAVE_PLANS.free.monthlyGenerationLimit;
}

export function resolvePlanFromVariantId(variantId, env = process.env) {
  const variantIdString = String(variantId || '');
  for (const plan of Object.values(WEBWEAVE_PLANS)) {
    for (const [billingCycle, envName] of Object.entries(plan.variants || {})) {
      if (env[envName] && String(env[envName]) === variantIdString) {
        return { planId: plan.id, billingCycle, limit: plan.monthlyGenerationLimit };
      }
    }
  }

  return { planId: 'free', billingCycle: 'monthly', limit: WEBWEAVE_PLANS.free.monthlyGenerationLimit };
}
```

- [ ] **Step 4: Run verification again**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL only for missing checkout route, webhook route, and migration.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add scripts/verify-billing-integration.mjs src/lib/billing/plans.js
git commit -m 'feat: add billing plan mapping'
```

---

### Task 2: Environment Example And Billing Migration

**Files:**
- Modify: `.env.local.example`
- Create: `supabase/migrations/002_billing_profiles.sql`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for env and migration content**

Add these entries to `expectations` in `scripts/verify-billing-integration.mjs`:

```js
  ['env has API key blank entry', '.env.local.example', 'LEMONSQUEEZY_API_KEY='],
  ['env has webhook secret blank entry', '.env.local.example', 'LEMONSQUEEZY_WEBHOOK_SECRET='],
  ['migration adds Lemon customer ID', 'supabase/migrations/002_billing_profiles.sql', 'lemon_customer_id text'],
  ['migration adds Lemon subscription ID', 'supabase/migrations/002_billing_profiles.sql', 'lemon_subscription_id text'],
  ['migration adds billing timestamp', 'supabase/migrations/002_billing_profiles.sql', 'billing_updated_at timestamptz'],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing blank env entries and migration column contents.

- [ ] **Step 3: Add LemonSqueezy blank env entries**

Append to `.env.local.example`:

```env

# =============================================
# WebWeave — LemonSqueezy Billing
# =============================================
# Values can be filled after LemonSqueezy store validation and product setup.
# Local webhook callback example: https://<ngrok-id>.ngrok-free.app/api/billing/webhook

LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_TEST_MODE=true

LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID=
LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Add migration**

Create `supabase/migrations/002_billing_profiles.sql`:

```sql
-- LemonSqueezy billing metadata for WebWeave profiles.

alter table public.profiles
add column if not exists lemon_customer_id text,
add column if not exists lemon_subscription_id text,
add column if not exists lemon_variant_id text,
add column if not exists lemon_status text,
add column if not exists billing_cycle text,
add column if not exists billing_updated_at timestamptz;

create index if not exists profiles_lemon_customer_id_idx on public.profiles(lemon_customer_id);
create index if not exists profiles_lemon_subscription_id_idx on public.profiles(lemon_subscription_id);
```

- [ ] **Step 5: Run verification again**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL only for missing checkout route and webhook route.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add .env.local.example supabase/migrations/002_billing_profiles.sql scripts/verify-billing-integration.mjs
git commit -m 'feat: add LemonSqueezy billing config entries'
```

---

### Task 3: LemonSqueezy Server Helper

**Files:**
- Create: `src/lib/billing/lemonsqueezy.js`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for helper functions**

Add these entries to `expectations`:

```js
  ['Lemon helper exists', 'src/lib/billing/lemonsqueezy.js', null],
  ['Lemon helper checks config', 'src/lib/billing/lemonsqueezy.js', 'getLemonSqueezyConfig'],
  ['Lemon helper creates checkout', 'src/lib/billing/lemonsqueezy.js', 'createLemonSqueezyCheckout'],
  ['Lemon helper verifies HMAC', 'src/lib/billing/lemonsqueezy.js', 'verifyLemonSqueezySignature'],
  ['Lemon helper uses timing safe compare', 'src/lib/billing/lemonsqueezy.js', 'timingSafeEqual'],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing `src/lib/billing/lemonsqueezy.js`.

- [ ] **Step 3: Implement helper**

Create `src/lib/billing/lemonsqueezy.js`:

```js
import crypto from 'node:crypto';
import { getPlanConfig, getVariantEnvName, normalizeBillingCycle, resolvePlanFromVariantId } from './plans';

const LEMON_API_URL = 'https://api.lemonsqueezy.com/v1/checkouts';

export function getLemonSqueezyConfig(env = process.env) {
  const apiKey = env.LEMONSQUEEZY_API_KEY || '';
  const storeId = env.LEMONSQUEEZY_STORE_ID || '';
  const webhookSecret = env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const testMode = env.LEMONSQUEEZY_TEST_MODE !== 'false';

  return {
    apiKey,
    storeId,
    webhookSecret,
    appUrl,
    testMode,
    checkoutConfigured: Boolean(apiKey && storeId),
    webhookConfigured: Boolean(webhookSecret),
  };
}

export function getCheckoutVariantId(planId, billingCycle, env = process.env) {
  const envName = getVariantEnvName(planId, billingCycle);
  return envName ? env[envName] || '' : '';
}

export async function createLemonSqueezyCheckout({ planId, billingCycle, user, env = process.env }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getLemonSqueezyConfig(env);

  if (!plan?.checkoutEnabled) {
    return { success: false, configured: config.checkoutConfigured, error: 'This plan is not available for checkout.' };
  }

  const variantId = getCheckoutVariantId(planId, cycle, env);
  if (!config.checkoutConfigured || !variantId) {
    return { success: false, configured: false, error: 'Payment gateway is not configured yet.' };
  }

  const response = await fetch(LEMON_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          test_mode: config.testMode,
          product_options: {
            redirect_url: config.appUrl,
            enabled_variants: [Number(variantId)],
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: true,
            locale: 'id',
            button_color: '#3b82f6',
            button_text_color: '#ffffff',
          },
          checkout_data: {
            email: user.email || '',
            custom: {
              user_id: user.id,
              plan: plan.id,
              billing_cycle: cycle,
            },
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(config.storeId) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, configured: true, error: payload?.errors?.[0]?.detail || 'Failed to create checkout.' };
  }

  const checkoutUrl = payload?.data?.attributes?.url;
  if (!checkoutUrl) return { success: false, configured: true, error: 'Checkout URL was not returned.' };

  return { success: true, configured: true, checkoutUrl };
}

export function verifyLemonSqueezySignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;

  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature, 'utf8');

  if (digest.length !== received.length) return false;
  return crypto.timingSafeEqual(digest, received);
}

export function mapWebhookToEntitlement(payload, env = process.env) {
  const meta = payload?.meta || {};
  const attributes = payload?.data?.attributes || {};
  const customData = meta.custom_data || {};
  const variantId = attributes.variant_id || attributes.first_subscription_item?.variant_id || attributes.product_id;
  const fallback = resolvePlanFromVariantId(variantId, env);
  const planId = customData.plan || fallback.planId;
  const billingCycle = customData.billing_cycle || fallback.billingCycle;
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const status = attributes.status || meta.event_name || 'unknown';
  const inactiveStatuses = ['expired', 'paused', 'past_due', 'unpaid'];
  const active = !inactiveStatuses.includes(status);

  return {
    userId: customData.user_id || '',
    planId: active ? plan.id : 'free',
    monthlyGenerationLimit: active ? plan.monthlyGenerationLimit : getPlanConfig('free').monthlyGenerationLimit,
    billingCycle: active ? billingCycle : 'monthly',
    lemonCustomerId: attributes.customer_id ? String(attributes.customer_id) : null,
    lemonSubscriptionId: payload?.data?.id ? String(payload.data.id) : null,
    lemonVariantId: variantId ? String(variantId) : null,
    lemonStatus: status,
  };
}
```

- [ ] **Step 4: Run verification again**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL only for route files and migration if Task 2 not complete; otherwise fail only for route files.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add src/lib/billing/lemonsqueezy.js scripts/verify-billing-integration.mjs
git commit -m 'feat: add LemonSqueezy billing helper'
```

---

### Task 4: Checkout API Route

**Files:**
- Create: `src/app/api/billing/checkout/route.js`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for checkout route content**

Add these entries to `expectations`:

```js
  ['checkout route requires auth', 'src/app/api/billing/checkout/route.js', 'getAuthenticatedUser'],
  ['checkout route calls Lemon helper', 'src/app/api/billing/checkout/route.js', 'createLemonSqueezyCheckout'],
  ['checkout route accepts plan', 'src/app/api/billing/checkout/route.js', 'body.plan'],
  ['checkout route accepts billing cycle', 'src/app/api/billing/checkout/route.js', 'body.billingCycle'],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing checkout route content.

- [ ] **Step 3: Implement checkout route**

Create `src/app/api/billing/checkout/route.js`:

```js
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { createLemonSqueezyCheckout } from '@/lib/billing/lemonsqueezy';
import { getPlanConfig, normalizeBillingCycle } from '@/lib/billing/plans';

export async function POST(req) {
  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const planId = String(body.plan || '').trim().toLowerCase();
  const billingCycle = normalizeBillingCycle(String(body.billingCycle || '').trim().toLowerCase());
  const plan = getPlanConfig(planId);

  if (!plan) return NextResponse.json({ success: false, error: 'Unknown billing plan.' }, { status: 400 });
  if (!plan.checkoutEnabled) return NextResponse.json({ success: false, error: 'This plan is not available for checkout.' }, { status: 400 });

  const checkout = await createLemonSqueezyCheckout({ planId, billingCycle, user: auth.user });
  if (!checkout.success) {
    return NextResponse.json(checkout, { status: checkout.configured === false ? 503 : 400 });
  }

  return NextResponse.json({ success: true, checkoutUrl: checkout.checkoutUrl });
}
```

- [ ] **Step 4: Run verification again**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL only for webhook route content if earlier tasks are complete.

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add src/app/api/billing/checkout/route.js scripts/verify-billing-integration.mjs
git commit -m 'feat: add LemonSqueezy checkout route'
```

---

### Task 5: Signed Webhook Route

**Files:**
- Create: `src/app/api/billing/webhook/route.js`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for webhook route content**

Add these entries to `expectations`:

```js
  ['webhook route reads raw body', 'src/app/api/billing/webhook/route.js', 'await req.text()'],
  ['webhook route reads X-Signature', 'src/app/api/billing/webhook/route.js', "req.headers.get('x-signature')"],
  ['webhook route verifies signature', 'src/app/api/billing/webhook/route.js', 'verifyLemonSqueezySignature'],
  ['webhook route maps entitlement', 'src/app/api/billing/webhook/route.js', 'mapWebhookToEntitlement'],
  ['webhook route updates profiles', 'src/app/api/billing/webhook/route.js', ".from('profiles')"],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing webhook route content.

- [ ] **Step 3: Implement webhook route**

Create `src/app/api/billing/webhook/route.js`:

```js
import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getLemonSqueezyConfig, mapWebhookToEntitlement, verifyLemonSqueezySignature } from '@/lib/billing/lemonsqueezy';

const SUPPORTED_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_payment_success',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
]);

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const config = getLemonSqueezyConfig();

  if (!config.webhookConfigured) {
    return NextResponse.json({ success: false, error: 'Webhook is not configured.' }, { status: 503 });
  }

  if (!verifyLemonSqueezySignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name || '';
  if (!SUPPORTED_EVENTS.has(eventName)) {
    return NextResponse.json({ success: true, ignored: true, eventName });
  }

  const entitlement = mapWebhookToEntitlement(payload);
  if (!entitlement.userId) {
    return NextResponse.json({ success: false, error: 'Webhook missing user_id custom data.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: entitlement.planId,
      monthly_generation_limit: entitlement.monthlyGenerationLimit,
      lemon_customer_id: entitlement.lemonCustomerId,
      lemon_subscription_id: entitlement.lemonSubscriptionId,
      lemon_variant_id: entitlement.lemonVariantId,
      lemon_status: entitlement.lemonStatus,
      billing_cycle: entitlement.billingCycle,
      billing_updated_at: new Date().toISOString(),
    })
    .eq('id', entitlement.userId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, eventName, plan: entitlement.planId });
}
```

- [ ] **Step 4: Run verification again**

Run: `node scripts/verify-billing-integration.mjs`

Expected: PASS if Tasks 1-5 are complete.

- [ ] **Step 5: Commit Task 5**

Run:

```powershell
git add src/app/api/billing/webhook/route.js scripts/verify-billing-integration.mjs
git commit -m 'feat: add LemonSqueezy webhook route'
```

---

### Task 6: Pricing UI Checkout Wiring

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/components/PricingPage.js`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for frontend checkout wiring**

Add these entries to `expectations`:

```js
  ['page exposes pricing checkout handler', 'src/app/page.js', 'handlePricingCheckout'],
  ['page calls billing checkout API', 'src/app/page.js', "fetch('/api/billing/checkout'"],
  ['pricing page receives checkout prop', 'src/components/PricingPage.js', 'onCheckout'],
  ['pricing page handles checkout loading', 'src/components/PricingPage.js', 'checkoutLoadingPlan'],
  ['pricing page redirects checkout URL', 'src/components/PricingPage.js', 'window.location.href = checkout.checkoutUrl'],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing frontend checkout wiring.

- [ ] **Step 3: Add parent checkout handler in `src/app/page.js`**

Add this function near `handleClosePricing`:

```js
  const handlePricingCheckout = async ({ plan, billingCycle }) => {
    if (!user || !supabase) {
      return { success: false, error: 'Sign in dulu sebelum checkout.' };
    }

    const headers = await getAuthHeaders();
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, billingCycle }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Checkout belum bisa dibuat.' };
    }

    return { success: true, checkoutUrl: data.checkoutUrl };
  };
```

Change PricingPage render:

```jsx
            <PricingPage onClose={handleClosePricing} onCheckout={handlePricingCheckout} />
```

- [ ] **Step 4: Update PricingPage checkout behavior**

Change component signature and state:

```js
export default function PricingPage({ onClose, onCheckout }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [actionMessage, setActionMessage] = useState('Pilih paket untuk checkout. Env LemonSqueezy bisa diisi nanti.');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');
```

Replace `handlePlanClick` with:

```js
  const handlePlanClick = async (plan) => {
    if (plan.disabled) return;
    if (!onCheckout) {
      setActionMessage('Checkout belum terhubung. Integrasi payment perlu diaktifkan dulu.');
      return;
    }

    setCheckoutLoadingPlan(plan.id);
    setActionMessage(`Membuat checkout ${plan.name}...`);

    try {
      const checkout = await onCheckout({ plan: plan.id, billingCycle });
      if (!checkout.success) {
        setActionMessage(checkout.error || 'Checkout belum tersedia.');
        return;
      }

      setActionMessage('Redirecting to LemonSqueezy checkout...');
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setActionMessage(err.message || 'Checkout gagal dibuat.');
    } finally {
      setCheckoutLoadingPlan('');
    }
  };
```

Change button label area:

```jsx
                {checkoutLoadingPlan === plan.id ? 'Preparing checkout...' : plan.cta}
```

- [ ] **Step 5: Run verification and build**

Run:

```powershell
node scripts/verify-billing-integration.mjs
npm run build
```

Expected: verification PASS and build PASS.

- [ ] **Step 6: Commit Task 6**

Run:

```powershell
git add src/app/page.js src/components/PricingPage.js scripts/verify-billing-integration.mjs
git commit -m 'feat: connect pricing CTAs to billing checkout'
```

---

### Task 7: Monthly Generation Quota Enforcement

**Files:**
- Modify: `src/app/api/generate/route.js`
- Modify: `scripts/verify-billing-integration.mjs`

- [ ] **Step 1: Extend failing verification for quota enforcement**

Add these entries to `expectations`:

```js
  ['generate route imports auth helper', 'src/app/api/generate/route.js', 'getAuthenticatedUser'],
  ['generate route checks monthly_generation_limit', 'src/app/api/generate/route.js', 'monthly_generation_limit'],
  ['generate route counts current month usage', 'src/app/api/generate/route.js', 'generation_requested'],
  ['generate route returns quota error', 'src/app/api/generate/route.js', 'Monthly generation limit reached'],
```

- [ ] **Step 2: Run verification to confirm RED**

Run: `node scripts/verify-billing-integration.mjs`

Expected: FAIL for missing quota enforcement.

- [ ] **Step 3: Import Supabase helper**

At top of `src/app/api/generate/route.js`, add:

```js
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
```

- [ ] **Step 4: Add quota helper functions**

Add before `export async function POST(req)`:

```js
function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function checkUserGenerationQuota(req) {
  if (!hasSupabaseServerConfig()) return { allowed: true, auth: null };

  const authorization = req.headers.get('authorization') || '';
  if (!authorization) return { allowed: true, auth: null };

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return { allowed: false, status: auth.status, error: auth.error };

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('plan, monthly_generation_limit')
    .eq('id', auth.user.id)
    .single();

  if (profileError) return { allowed: false, status: 500, error: profileError.message };

  const limit = Number(profile?.monthly_generation_limit || 30);
  const { data: events, error: usageError } = await auth.supabase
    .from('usage_events')
    .select('quantity')
    .eq('owner_id', auth.user.id)
    .eq('event_type', 'generation_requested')
    .gte('created_at', getMonthStartIso());

  if (usageError) return { allowed: false, status: 500, error: usageError.message };

  const used = (events || []).reduce((sum, event) => sum + Number(event.quantity || 0), 0);
  if (used >= limit) {
    return { allowed: false, status: 402, error: 'Monthly generation limit reached. Upgrade your plan to continue.', used, limit };
  }

  return { allowed: true, auth, used, limit };
}

async function recordGenerationRequested(auth) {
  if (!auth?.supabase || !auth?.user?.id) return;
  await auth.supabase.from('usage_events').insert({
    owner_id: auth.user.id,
    event_type: 'generation_requested',
    quantity: 1,
    metadata: { source: 'generate_api' },
  });
}
```

- [ ] **Step 5: Call quota before browser/AI work**

Inside `POST`, immediately after request body size check and before `await req.json()`, add:

```js
    const quota = await checkUserGenerationQuota(req);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.error, used: quota.used, limit: quota.limit }, { status: quota.status });
    }
```

After successful AI response and before `return NextResponse.json({ success: true`, add:

```js
    await recordGenerationRequested(quota.auth);
```

- [ ] **Step 6: Run verification and build**

Run:

```powershell
node scripts/verify-billing-integration.mjs
npm run build
```

Expected: verification PASS and build PASS.

- [ ] **Step 7: Commit Task 7**

Run:

```powershell
git add src/app/api/generate/route.js scripts/verify-billing-integration.mjs
git commit -m 'feat: enforce monthly generation quota'
```

---

### Task 8: README LemonSqueezy Tutorial

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add tutorial section**

Insert after the environment setup section in `README.md`:

```md
### Optional LemonSqueezy Billing Setup

Billing can be implemented before LemonSqueezy validation is finished. Leave the LemonSqueezy variables blank during development; checkout buttons will show a safe configuration message instead of crashing.

1. Create/login to LemonSqueezy.
2. Enable Test Mode.
3. Create a store named `WebWeave`.
4. Create subscription products for `WebWeave Starter` and `WebWeave Pro`.
5. Create variants:
   - Starter Monthly: Rp49.000/month.
   - Starter Annual: around Rp470.000/year.
   - Pro Monthly: Rp129.000/month.
   - Pro Annual: around Rp1.238.000/year.
6. Copy store ID and variant IDs.
7. Create a LemonSqueezy API key.
8. For local webhook testing, run `ngrok http 3000`.
9. Set webhook callback URL to `https://<ngrok-id>.ngrok-free.app/api/billing/webhook` for local testing.
10. Use `https://<your-domain>/api/billing/webhook` for production.
11. Add webhook events: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`.
12. Copy the webhook signing secret into `LEMONSQUEEZY_WEBHOOK_SECRET`.
13. Fill `.env.local` and restart the Next.js dev server.
```

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Commit Task 8**

Run:

```powershell
git add README.md
git commit -m 'docs: add LemonSqueezy setup tutorial'
```

---

### Task 9: Final Verification

**Files:**
- Verify all files changed by Tasks 1-8.

- [ ] **Step 1: Run billing verification**

Run: `node scripts/verify-billing-integration.mjs`

Expected: `Billing integration verification passed.`

- [ ] **Step 2: Run existing pricing verification if present**

Run: `if (Test-Path -LiteralPath "scripts/verify-pricing-page.mjs") { node scripts/verify-pricing-page.mjs }`

Expected: pass if the file exists.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next.js build completes successfully.

- [ ] **Step 4: Inspect final status**

Run:

```powershell
git status --short
git log --oneline -10
```

Expected: no unintended modified files beyond any explicitly pending user work.

- [ ] **Step 5: Manual test missing env behavior**

Run: `npm run dev`

Manual steps:
- Open `http://localhost:3000`.
- Sign in.
- Open pricing modal.
- Click Starter.

Expected: friendly message says payment gateway is not configured yet.

- [ ] **Step 6: Manual test with Lemon test env**

After LemonSqueezy IDs and API key are available:
- Fill env variables.
- Restart `npm run dev`.
- Run `ngrok http 3000`.
- Configure Lemon webhook callback.
- Click Starter.

Expected:
- Browser redirects to LemonSqueezy checkout.
- After test payment, webhook updates `public.profiles.plan` to `starter` and `monthly_generation_limit` to `500`.

---

## Self-Review Notes

- Spec coverage: checkout creation, webhook signature verification, env-last behavior, Supabase billing columns, pricing CTA wiring, quota enforcement, and LemonSqueezy tutorial are covered.
- No vague task content remains; every task has concrete files, commands, and expected results.
- Function names are consistent across tasks: `createLemonSqueezyCheckout`, `verifyLemonSqueezySignature`, `mapWebhookToEntitlement`, and `handlePricingCheckout`.
