# SaaS Pricing and Monthly Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement WebWeave SaaS plan limits, monthly generation quota enforcement, framework gating, project caps, pricing copy, and quota UI.

**Architecture:** Keep `src/lib/billing/plans.js` as plan source of truth and add a focused server-side quota helper in `src/lib/billing/quota.js`. Generate, account usage, projects, billing, and UI consume those central rules instead of duplicating limits.

**Tech Stack:** Next.js App Router route handlers, React client page, Supabase auth/database, Midtrans billing, static Node verification scripts.

---

## File Structure

- Modify: `src/lib/billing/plans.js`
  - Owns plan metadata: prices, monthly generation limits, project limits, allowed frameworks, checkout disabled state.
  - Exports helpers used by backend and UI-facing API responses.
- Create: `src/lib/billing/quota.js`
  - Owns server-side usage counting, billing-expiry downgrade, quota status, framework authorization, and usage event insert.
- Modify: `src/app/api/generate/route.js`
  - Moves quota check after request validation but before browser/AI work.
  - Requires auth when Supabase server config exists.
  - Records usage only after successful generated response is ready.
- Create: `src/app/api/account/usage/route.js`
  - Returns current plan, monthly usage, limit, remaining count, and allowed frameworks for UI.
- Modify: `src/app/api/projects/route.js`
  - Enforces plan project limits before project insert.
- Modify: `src/app/api/billing/checkout/route.js`
  - Keeps Team disabled with existing `checkoutEnabled` rule.
  - No functional change expected unless helper names change.
- Modify: `src/lib/billing/midtrans.js`
  - Uses updated central plan limits/prices automatically.
- Modify: `src/components/PricingPage.js`
  - Updates plan prices, quota copy, project copy, framework copy, Team disabled copy.
- Modify: `src/app/page.js`
  - Loads usage status, sends auth header to `/api/generate`, disables unsupported frameworks, shows quota indicator, blocks exhausted quota locally.
- Modify: `src/app/page.module.css`
  - Adds quota/plan pill and disabled framework option styling where CSS is needed.
- Modify: `README.md`
  - Adds public-safe pricing/quota section without private DB or secret values.
- Modify: `scripts/verify-billing-integration.mjs`
  - Updates previous quota expectations to the approved SaaS limits.
- Create: `scripts/verify-saas-pricing-quota.mjs`
  - Static verification for plan config, quota helper wiring, route ordering markers, UI copy, and exact error string.

Do not commit during execution unless user explicitly asks for commits.

---

### Task 1: Central Plan Config

**Files:**
- Modify: `src/lib/billing/plans.js`
- Create: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Write static verification script for new plan config**

Create `scripts/verify-saas-pricing-quota.mjs` with initial plan checks:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const checks = [
  ['plans file exists', 'src/lib/billing/plans.js', null],
  ['free limit 5', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 5'],
  ['starter limit 75', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 75'],
  ['pro limit 300', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 300'],
  ['team limit 1000', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 1000'],
  ['starter Midtrans monthly price', 'src/lib/billing/plans.js', 'monthly: 49000'],
  ['pro Midtrans monthly price', 'src/lib/billing/plans.js', 'monthly: 129000'],
  ['team Midtrans monthly price configured', 'src/lib/billing/plans.js', 'monthly: 299000'],
  ['free project limit 1', 'src/lib/billing/plans.js', 'projectLimit: 1'],
  ['starter project limit 5', 'src/lib/billing/plans.js', 'projectLimit: 5'],
  ['pro project limit 25', 'src/lib/billing/plans.js', 'projectLimit: 25'],
  ['allowed frameworks configured', 'src/lib/billing/plans.js', 'allowedFrameworks'],
  ['framework helper exported', 'src/lib/billing/plans.js', 'export function isFrameworkAllowedForPlan'],
];

const missing = checks.filter(([, path, token]) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return true;
  if (!token) return false;
  return !read(path).includes(token);
});

const plansText = read('src/lib/billing/plans.js');
const unlimitedGeneration = /monthlyGenerationLimit:\s*(Infinity|null|undefined)|unlimited generations/i.test(plansText);

if (missing.length || unlimitedGeneration) {
  console.error('SaaS pricing/quota verification failed:');
  for (const [label, path, token] of missing) {
    console.error(`- ${label}: ${path}${token ? ` missing "${token}"` : ' missing file'}`);
  }
  if (unlimitedGeneration) console.error('- monthly generation must not be unlimited');
  process.exit(1);
}

console.log('SaaS pricing/quota verification passed.');
```

- [ ] **Step 2: Run script and verify it fails on current config**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: FAIL, listing missing new plan limits/helpers.

- [ ] **Step 3: Replace plan config with SaaS plan metadata**

In `src/lib/billing/plans.js`, update plan objects and add framework/project helpers. Keep existing Lemon variant env names for dormant future use.

```js
export const SUPPORTED_FRAMEWORKS = [
  'playwright_js',
  'playwright_python',
  'puppeteer_js',
  'selenium_python',
  'cypress_js',
];

const STARTER_FRAMEWORKS = ['playwright_js', 'playwright_python', 'selenium_python', 'cypress_js'];

export const WEBWEAVE_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyGenerationLimit: 5,
    projectLimit: 1,
    allowedFrameworks: ['playwright_js'],
    checkoutEnabled: false,
    publicEnabled: true,
    variants: {},
    midtransPrices: { monthly: 0, annual: 0 },
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyGenerationLimit: 75,
    projectLimit: 5,
    allowedFrameworks: STARTER_FRAMEWORKS,
    checkoutEnabled: true,
    publicEnabled: true,
    variants: {
      monthly: 'LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID',
      annual: 'LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID',
    },
    midtransPrices: {
      monthly: 49000,
      annual: 470000,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyGenerationLimit: 300,
    projectLimit: 25,
    allowedFrameworks: SUPPORTED_FRAMEWORKS,
    checkoutEnabled: true,
    publicEnabled: true,
    variants: {
      monthly: 'LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID',
      annual: 'LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID',
    },
    midtransPrices: {
      monthly: 129000,
      annual: 1238000,
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyGenerationLimit: 1000,
    projectLimit: 50,
    allowedFrameworks: SUPPORTED_FRAMEWORKS,
    checkoutEnabled: false,
    publicEnabled: false,
    variants: {},
    midtransPrices: {
      monthly: 299000,
      annual: 2870000,
    },
  },
};

export function getProjectLimit(planId) {
  return getPlanConfig(planId)?.projectLimit || WEBWEAVE_PLANS.free.projectLimit;
}

export function getAllowedFrameworks(planId) {
  return getPlanConfig(planId)?.allowedFrameworks || WEBWEAVE_PLANS.free.allowedFrameworks;
}

export function isFrameworkAllowedForPlan(planId, framework) {
  return getAllowedFrameworks(planId).includes(framework);
}
```

- [ ] **Step 4: Run plan verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

---

### Task 2: Server Quota Helper

**Files:**
- Create: `src/lib/billing/quota.js`
- Modify: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Extend verification for quota helper exports**

Add checks to `scripts/verify-saas-pricing-quota.mjs`:

```js
checks.push(
  ['quota helper exists', 'src/lib/billing/quota.js', null],
  ['quota exact error exported', 'src/lib/billing/quota.js', 'Monthly generation limit reached. Please upgrade your plan to continue.'],
  ['quota status helper exported', 'src/lib/billing/quota.js', 'export async function getGenerationQuotaStatus'],
  ['quota assertion helper exported', 'src/lib/billing/quota.js', 'export async function assertCanGenerate'],
  ['usage recording helper exported', 'src/lib/billing/quota.js', 'export async function recordGenerationRequested'],
  ['usage event type centralized', 'src/lib/billing/quota.js', "GENERATION_EVENT_TYPE = 'generation_requested'"]
);
```

- [ ] **Step 2: Run script and verify it fails because helper is missing**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: FAIL for missing `src/lib/billing/quota.js`.

- [ ] **Step 3: Create quota helper**

Create `src/lib/billing/quota.js`:

```js
import {
  getAllowedFrameworks,
  getPlanConfig,
  getPlanLimit,
  isFrameworkAllowedForPlan,
} from './plans';

export const GENERATION_EVENT_TYPE = 'generation_requested';
export const QUOTA_LIMIT_REACHED_MESSAGE = 'Monthly generation limit reached. Please upgrade your plan to continue.';

export function getMonthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function isBillingExpired(profile, now = new Date()) {
  if (!profile?.billing_period_ends_at) return false;
  const expiresAt = new Date(profile.billing_period_ends_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

export function resolveActivePlanId(profile, now = new Date()) {
  if (isBillingExpired(profile, now)) return 'free';
  return getPlanConfig(profile?.plan)?.id || 'free';
}

export function resolveGenerationLimit(profile, now = new Date()) {
  const planId = resolveActivePlanId(profile, now);
  const profileLimit = Number(profile?.monthly_generation_limit || 0);
  return profileLimit > 0 && planId !== 'free' ? profileLimit : getPlanLimit(planId);
}

export async function getUserBillingProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, monthly_generation_limit, billing_period_ends_at')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function countMonthlyGenerationUsage(supabase, userId, now = new Date()) {
  const { data, error } = await supabase
    .from('usage_events')
    .select('quantity')
    .eq('owner_id', userId)
    .eq('event_type', GENERATION_EVENT_TYPE)
    .gte('created_at', getMonthStartIso(now));

  if (error) throw new Error(error.message);
  return (data || []).reduce((sum, event) => sum + Number(event.quantity || 0), 0);
}

export async function getGenerationQuotaStatus(auth, now = new Date()) {
  const profile = await getUserBillingProfile(auth.supabase, auth.user.id);
  const planId = resolveActivePlanId(profile, now);
  const plan = getPlanConfig(planId) || getPlanConfig('free');
  const limit = resolveGenerationLimit(profile, now);
  const used = await countMonthlyGenerationUsage(auth.supabase, auth.user.id, now);
  const remaining = Math.max(limit - used, 0);

  return {
    planId,
    planLabel: plan.label,
    used,
    limit,
    remaining,
    exhausted: used >= limit,
    allowedFrameworks: getAllowedFrameworks(planId),
    billingExpired: isBillingExpired(profile, now),
  };
}

export async function assertCanGenerate(auth, framework, now = new Date()) {
  const status = await getGenerationQuotaStatus(auth, now);

  if (!isFrameworkAllowedForPlan(status.planId, framework)) {
    return {
      allowed: false,
      status: 403,
      error: `${status.planLabel} plan does not include this framework. Please upgrade your plan to continue.`,
      quota: status,
    };
  }

  if (status.exhausted) {
    return { allowed: false, status: 402, error: QUOTA_LIMIT_REACHED_MESSAGE, quota: status };
  }

  return { allowed: true, quota: status };
}

export async function recordGenerationRequested(auth) {
  if (!auth?.supabase || !auth?.user?.id) return;
  await auth.supabase.from('usage_events').insert({
    owner_id: auth.user.id,
    event_type: GENERATION_EVENT_TYPE,
    quantity: 1,
    metadata: { source: 'generate_api' },
  });
}
```

- [ ] **Step 4: Run plan verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

---

### Task 3: Generate API Enforcement

**Files:**
- Modify: `src/app/api/generate/route.js`
- Modify: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Extend verification for generate route ordering and auth**

Add checks:

```js
checks.push(
  ['generate imports quota helper', 'src/app/api/generate/route.js', "from '@/lib/billing/quota'"],
  ['generate requires auth when Supabase configured', 'src/app/api/generate/route.js', 'Sign in required to generate automations.'],
  ['generate checks quota after validation marker', 'src/app/api/generate/route.js', 'const generationAccess = await assertCanGenerate(auth, framework);'],
  ['generate records success after quality gate', 'src/app/api/generate/route.js', 'await recordGenerationRequested(auth);'],
  ['generate exact quota message wired', 'src/app/api/generate/route.js', 'QUOTA_LIMIT_REACHED_MESSAGE']
);
```

- [ ] **Step 2: Run script and verify it fails on current route**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: FAIL for missing imports/new route markers.

- [ ] **Step 3: Replace local quota helpers with centralized imports**

In `src/app/api/generate/route.js`, replace `import { getPlanConfig } from '@/lib/billing/plans';` with:

```js
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import {
  QUOTA_LIMIT_REACHED_MESSAGE,
  assertCanGenerate,
  recordGenerationRequested,
} from '@/lib/billing/quota';
```

Remove local functions `getMonthStartIso`, `isBillingExpired`, `checkUserGenerationQuota`, and `recordGenerationRequested` from lines around the current quota helper section.

- [ ] **Step 4: Move auth/quota checks after request validation**

At start of `POST`, keep rate limit and body size before JSON parsing, validate URL/prompt, then authenticate and check quota before provider/browser/AI work.

Use this structure:

```js
export async function POST(req) {
  let browser = null;
  try {
    const retryAfter = checkRateLimit(getClientId(req));
    if (retryAfter) {
      return NextResponse.json({
        error: `Rate limit reached. Try again in ${retryAfter} seconds.`
      }, {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      });
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({
        error: `Request body is too large. Max ${MAX_REQUEST_BYTES} bytes.`
      }, { status: 413 });
    }

    const { url, prompt, framework, provider: userProvider, modelId: userModelId } = await req.json();

    let safeUrl;
    let safePrompt;
    try {
      safeUrl = await validateTargetUrl(url);
      safePrompt = validatePrompt(prompt);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    let auth = null;
    if (hasSupabaseServerConfig()) {
      auth = await getAuthenticatedUser(req);
      if (auth.error) {
        return NextResponse.json({ error: auth.status === 401 ? 'Sign in required to generate automations.' : auth.error }, { status: auth.status });
      }

      const generationAccess = await assertCanGenerate(auth, framework);
      if (!generationAccess.allowed) {
        return NextResponse.json({
          error: generationAccess.error,
          used: generationAccess.quota?.used,
          limit: generationAccess.quota?.limit,
          remaining: generationAccess.quota?.remaining,
        }, { status: generationAccess.status });
      }
    }

    // Keep the existing provider detection block immediately after this point,
    // followed by the current browser scraping and AI generation phases.
```

- [ ] **Step 5: Keep usage insert after success gate only**

Replace current `await recordGenerationRequested(quota.auth);` with:

```js
    await recordGenerationRequested(auth);
```

Keep it after `qualityGate.status === 'fail'` return and immediately before successful `NextResponse.json({ success: true, ... })`.

- [ ] **Step 6: Run verification and build smoke check**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

Run: `npm run build`

Expected: production build succeeds.

---

### Task 4: Account Usage API and Project Limits

**Files:**
- Create: `src/app/api/account/usage/route.js`
- Modify: `src/app/api/projects/route.js`
- Modify: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Extend verification for account usage and project limits**

Add checks:

```js
checks.push(
  ['account usage route exists', 'src/app/api/account/usage/route.js', null],
  ['account usage route returns quota status', 'src/app/api/account/usage/route.js', 'getGenerationQuotaStatus'],
  ['projects route imports project limit helper', 'src/app/api/projects/route.js', 'getProjectLimit'],
  ['projects route counts existing projects', 'src/app/api/projects/route.js', '.from(\'projects\')'],
  ['projects route returns project limit error', 'src/app/api/projects/route.js', 'Project limit reached. Please upgrade your plan to create more projects.']
);
```

- [ ] **Step 2: Create account usage route**

Create `src/app/api/account/usage/route.js`:

```js
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getGenerationQuotaStatus } from '@/lib/billing/quota';

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, usage: null });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const usage = await getGenerationQuotaStatus(auth);
    return NextResponse.json({ success: true, configured: true, usage });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add project limit enforcement to projects POST**

In `src/app/api/projects/route.js`, add imports:

```js
import { getProjectLimit } from '@/lib/billing/plans';
import { getUserBillingProfile, resolveActivePlanId } from '@/lib/billing/quota';
```

Before the project insert, add:

```js
  try {
    const profile = await getUserBillingProfile(auth.supabase, auth.user.id);
    const planId = resolveActivePlanId(profile);
    const projectLimit = getProjectLimit(planId);
    const { count, error: countError } = await auth.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id);

    if (countError) throw new Error(countError.message);
    if (Number(count || 0) >= projectLimit) {
      return NextResponse.json({
        success: false,
        error: 'Project limit reached. Please upgrade your plan to create more projects.',
        limit: projectLimit,
      }, { status: 402 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
```

- [ ] **Step 4: Run verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

---

### Task 5: Frontend Quota UX and Auth Headers

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/app/page.module.css`
- Modify: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Extend verification for frontend quota UX**

Add checks:

```js
checks.push(
  ['page loads account usage API', 'src/app/page.js', "fetch('/api/account/usage'"],
  ['page sends auth headers to generate', 'src/app/page.js', "fetch('/api/generate'"],
  ['page has usage status state', 'src/app/page.js', 'usageStatus'],
  ['page disables exhausted generate', 'src/app/page.js', 'quotaExhausted'],
  ['page disables unsupported framework options', 'src/app/page.js', 'isFrameworkAllowed'],
  ['page includes quota styles', 'src/app/page.module.css', '.quotaPill']
);
```

- [ ] **Step 2: Add usage state and derived values**

In `src/app/page.js`, add state near existing auth/history state:

```js
  const [usageStatus, setUsageStatus] = useState(null);
```

Add derived values near `selectedFrameworkLabel`:

```js
  const allowedFrameworks = usageStatus?.allowedFrameworks || ['playwright_js'];
  const isFrameworkAllowed = (value) => allowedFrameworks.includes(value);
  const quotaExhausted = Boolean(usageStatus?.exhausted);
  const quotaLabel = usageStatus
    ? `${usageStatus.used}/${usageStatus.limit} generations used`
    : (user ? 'Loading quota...' : 'Sign in for monthly quota');
```

- [ ] **Step 3: Load usage with private data**

In `loadPrivateData`, fetch usage together with projects/scripts:

```js
      const [projectResponse, scriptResponse, usageResponse] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/generated-scripts', { headers }),
        fetch('/api/account/usage', { headers }),
      ]);
```

After parsing project/script responses, parse and store usage:

```js
      const usageData = await usageResponse.json();
      if (usageData.success) setUsageStatus(usageData.usage || null);
```

When user logs out or disappears, reset `usageStatus` to `null`.

- [ ] **Step 4: Send auth headers to generate and refresh usage after success**

Inside `handleGenerate`, before `fetch('/api/generate')`, require sign-in when Supabase is enabled:

```js
      const authHeaders = user && supabase ? await getAuthHeaders() : {};
      if (SUPABASE_ENABLED && !authHeaders.Authorization) throw new Error('Sign in required to generate automations.');
```

Change generate fetch headers:

```js
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
```

After successful result/save handling, refresh private data:

```js
      if (user) await loadPrivateData();
```

- [ ] **Step 5: Block exhausted quota and unsupported framework before submit**

At top of `handleGenerate` after URL/objective validation:

```js
    if (quotaExhausted) {
      setError('Monthly generation limit reached. Please upgrade your plan to continue.');
      return;
    }

    if (usageStatus && !isFrameworkAllowed(framework)) {
      setError('Your current plan does not include this framework. Please upgrade your plan to continue.');
      return;
    }
```

- [ ] **Step 6: Disable unsupported framework options**

Replace both framework option maps with:

```jsx
{FRAMEWORKS.map((item) => (
  <option key={item.value} value={item.value} disabled={usageStatus ? !isFrameworkAllowed(item.value) : false}>
    {item.label}{usageStatus && !isFrameworkAllowed(item.value) ? ' - upgrade' : ''}
  </option>
))}
```

- [ ] **Step 7: Disable generate buttons when exhausted**

Change workspace generate button disabled prop:

```jsx
disabled={loading || quotaExhausted || (usageStatus && !isFrameworkAllowed(framework))}
```

Change hero generate button disabled prop the same way.

Regenerate button should include quota/framework checks too:

```jsx
disabled={loading || quotaExhausted || (usageStatus && !isFrameworkAllowed(framework)) || !generationFeedback.trim()}
```

- [ ] **Step 8: Show quota pill in workspace and hero**

Add near workspace framework/project controls:

```jsx
<div className={styles.quotaPill} title={usageStatus?.planLabel ? `${usageStatus.planLabel} plan` : 'Monthly quota'}>
  <ShieldCheck size={14} />
  <span>{quotaLabel}</span>
</div>
```

Add similar pill inside hero composer metadata before Generate button.

- [ ] **Step 9: Add CSS**

Append to `src/app/page.module.css` near form/button styles:

```css
.quotaPill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  color: var(--muted-text);
  background: rgba(15, 23, 42, 0.36);
  font-size: 0.82rem;
  white-space: nowrap;
}

.lightMode .quotaPill {
  background: rgba(255, 255, 255, 0.72);
}
```

- [ ] **Step 10: Run verification and build**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

Run: `npm run build`

Expected: production build succeeds.

---

### Task 6: Pricing UI and Docs

**Files:**
- Modify: `src/components/PricingPage.js`
- Modify: `README.md`
- Modify: `scripts/verify-billing-integration.mjs`
- Modify: `scripts/verify-saas-pricing-quota.mjs`

- [ ] **Step 1: Extend verification for pricing copy/docs**

Add checks:

```js
checks.push(
  ['pricing free quota', 'src/components/PricingPage.js', '5 generations/bulan'],
  ['pricing starter quota', 'src/components/PricingPage.js', '75 generations/bulan'],
  ['pricing pro quota', 'src/components/PricingPage.js', '300 generations/bulan'],
  ['pricing team quota', 'src/components/PricingPage.js', '1.000 generations/bulan'],
  ['pricing pro projects not unlimited', 'src/components/PricingPage.js', '25 project'],
  ['readme pricing quota section', 'README.md', 'Pricing and Quota'],
  ['readme mentions Midtrans active', 'README.md', 'Midtrans'],
  ['billing verification starter updated', 'scripts/verify-billing-integration.mjs', 'Starter limit 75'],
  ['billing verification pro updated', 'scripts/verify-billing-integration.mjs', 'Pro limit 300']
);
```

- [ ] **Step 2: Update pricing page plan literals**

In `src/components/PricingPage.js` update plan data:

```js
// Free
quota: '5 generations/bulan',
features: [
  '1 project pribadi',
  'Playwright JavaScript only',
  'Copy dan download script',
  'Riwayat terbaru terbatas',
]

// Starter
quota: '75 generations/bulan',
features: [
  '5 project aktif',
  'Playwright JS/Python, Selenium Python, Cypress JS',
  'Saved scripts dan prompt history',
  'Regenerate dengan feedback',
  'Email support best-effort',
]

// Pro
quota: '300 generations/bulan',
features: [
  '25 project aktif',
  'All supported frameworks',
  'Priority generation queue',
  'Quality gate summary',
  'Priority support',
]

// Team
quota: '1.000 generations/bulan',
disabled: true,
features: [
  'Team workspace coming soon',
  'Shared project history',
  'All supported frameworks',
  'Admin controls planned',
  'Roadmap request priority',
]
```

Update summary copy so Starter is described as `75 generations/bulan`. Remove copy that says quota is very loose if it conflicts with new lower limits.

- [ ] **Step 3: Update billing verification previous limits**

In `scripts/verify-billing-integration.mjs`, replace:

```js
['Starter limit 500', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 500'],
['Pro limit 2000', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 2000'],
```

with:

```js
['Starter limit 75', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 75'],
['Pro limit 300', 'src/lib/billing/plans.js', 'monthlyGenerationLimit: 300'],
```

- [ ] **Step 4: Add README pricing section**

Add a public-safe section to `README.md`:

```md
## Pricing and Quota

WebWeave uses monthly generation quotas. One successful `/api/generate` response consumes one generation. Failed validation, blocked URLs, unsupported frameworks, browser failures, AI failures, and safety-gate failures do not consume quota.

| Plan | Monthly price | Generations/month | Projects | Frameworks |
| --- | ---: | ---: | ---: | --- |
| Free | Rp0 | 5 | 1 | Playwright JavaScript |
| Starter | Rp49.000 | 75 | 5 | Playwright JS/Python, Selenium Python, Cypress JS |
| Pro | Rp129.000 | 300 | 25 | All supported frameworks |
| Team | Rp299.000 | 1.000 | Coming soon | All supported frameworks |

Midtrans is the active checkout provider. Team checkout and LemonSqueezy billing are disabled in the current product.
```

- [ ] **Step 5: Run pricing/docs verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: PASS.

Run: `node scripts/verify-billing-integration.mjs`

Expected: PASS.

---

### Task 7: Final Verification

**Files:**
- Read/verify only unless failures require targeted fixes.

- [ ] **Step 1: Run SaaS quota verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: `SaaS pricing/quota verification passed.`

- [ ] **Step 2: Run existing billing verification**

Run: `node scripts/verify-billing-integration.mjs`

Expected: `Billing integration verification passed.`

- [ ] **Step 3: Run Midtrans verification**

Run: `node scripts/verify-midtrans-integration.mjs`

Expected: Midtrans integration/security verification passes.

- [ ] **Step 4: Run prompt guardrail verification**

Run: `node scripts/verify-prompt-injection-guardrails.mjs`

Expected: prompt injection/SSRF guardrail verification passes.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 6: Inspect working tree**

Run: `git status --short`

Expected: only intended files changed. Do not revert unrelated existing dirty files.

---

## Self-Review Notes

- Spec coverage: plan config, generation quotas, success-only usage increment, framework gating, Team disabled, Midtrans active, Lemon disabled, project limits, pricing UI, quota indicator, README, verification are covered.
- Auth tightening: generation requires auth when Supabase server config exists so production cannot have unlimited anonymous generation. Local dev without Supabase remains non-blocking.
- No new quota migration: usage continues to use `usage_events`.
- No unlimited generation: all plans have finite `monthlyGenerationLimit` values.
- Commit handling: no commit steps included because workspace policy says commit only when explicitly requested.
