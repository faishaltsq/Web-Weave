# Midtrans Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake PDF invoices with official Midtrans Invoicing API. Create Invoice records at checkout, store invoice IDs/PDF URLs, fetch official PDF via `GET /v1/invoices/{invoice_id}` when user requests invoice.

**Architecture:** Add Invoice API helpers to `midtrans.js`. Generate short `order_id` (≤36 chars) at checkout. Create Midtrans Invoice alongside Snap. Invoice route reads stored `midtrans_invoice_id`, fetches official invoice, returns `pdf_url`. Legacy Snap orders without invoice ID fall back to existing redirect/token behavior.

**Tech Stack:** Next.js 15 App Router, Supabase, Midtrans Snap + Invoicing API, Node.js Buffer/crypto, verification scripts (`scripts/verify-account-invoice-pdf.mjs`).

**Verification:** `node scripts/verify-account-invoice-pdf.mjs` — update expectations (red), implement (green), verify (green). Project has no jest/vitest; verification scripts are the test suite.

---

### Task 1: Add `generateOrderId` to midtrans.js

**Files:**
- Modify: `src/lib/billing/midtrans.js`

- [ ] **Step 1: Add `generateOrderId` export**

Insert after the existing import block (after line 3), before `getMidtransErrorMessage`:

```javascript
export function generateOrderId(userId, planId, cycle) {
  const prefix = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user';
  const payload = `${planId}_${cycle}_${Date.now()}_${crypto.randomBytes(4).toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(payload).digest('base64url').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
  return `ww_${prefix}_${hash}`;
}
```

- [ ] **Step 2: Verify order ID format and length**

Run: `node -e "import('./src/lib/billing/midtrans.js').then(m => { const id = m.generateOrderId('abc123def456', 'pro', 'monthly'); console.log('length:', id.length, 'id:', id); if (id.length > 36) { console.error('TOO LONG'); process.exit(1); } else { console.log('PASS'); } })"`

Expected: `length: 25`, `PASS`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing/midtrans.js
git commit -m "feat: add generateOrderId for short Midtrans-compatible order IDs"
```

---

### Task 2: Add Invoice API helpers to midtrans.js

**Files:**
- Modify: `src/lib/billing/midtrans.js`

- [ ] **Step 1: Add `buildMidtransInvoiceUrl` after `getMidtransConfig`**

Insert after the `getMidtransConfig` closing brace (currently line 29):

```javascript
export function buildMidtransInvoiceUrl(invoiceId, config) {
  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  return `${baseUrl}/v1/invoices/${encodeURIComponent(invoiceId)}`;
}
```

- [ ] **Step 2: Add `createMidtransInvoice` before `verifyMidtransSignature`**

Insert before `export function verifyMidtransSignature`:

```javascript
export async function createMidtransInvoice({ orderId, planId, billingCycle, user, env = process.env }) {
  const plan = getPlanConfig(planId);
  const cycle = normalizeBillingCycle(billingCycle);
  const config = getMidtransConfig(env);
  const price = getPlanPrice(planId, cycle);

  if (!config.serverKey || price <= 0) {
    return { success: false, error: 'Payment gateway is not configured.' };
  }

  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  try {
    const response = await fetch(`${baseUrl}/v1/invoices`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: price,
        },
        customer_details: {
          email: user?.email || '',
        },
        item_details: [
          {
            id: `${plan.id}_${cycle}`,
            price,
            quantity: 1,
            name: `WebWeave ${plan.label} ${cycle}`,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Midtrans Invoice creation failed', {
        status: response.status,
        error: getMidtransErrorMessage(payload),
      });
      return { success: false, error: 'Failed to create invoice.' };
    }

    return {
      success: true,
      invoice_id: payload.id || payload.invoice_id || '',
      invoice_number: payload.invoice_number || payload.number || '',
      pdf_url: payload.pdf_url || '',
      payment_link_url: payload.payment_link_url || '',
    };
  } catch (error) {
    console.error('Midtrans Invoice creation request failed', { error: error?.message || String(error) });
    return { success: false, error: 'Failed to create invoice.' };
  }
}
```

- [ ] **Step 3: Add `fetchMidtransInvoice` after `createMidtransInvoice`**

```javascript
export async function fetchMidtransInvoice(invoiceId, config) {
  if (!invoiceId || !config?.serverKey) return null;
  const url = buildMidtransInvoiceUrl(invoiceId, config);
  const authToken = Buffer.from(`${config.serverKey}:`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data;
  } catch (error) {
    console.error('Midtrans Invoice fetch failed', { error: error?.message || String(error) });
    return null;
  }
}
```

- [ ] **Step 4: Verify all new exports exist**

Run: `node -e "import('./src/lib/billing/midtrans.js').then(m => { for (const f of ['generateOrderId','createMidtransInvoice','fetchMidtransInvoice','buildMidtransInvoiceUrl']) { if (typeof m[f] !== 'function') { console.error('MISSING:', f); process.exit(1); } console.log('OK:', f); } })"`

Expected: `OK:` for all four.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/midtrans.js
git commit -m "feat: add Midtrans Invoice API create/fetch helpers"
```

---

### Task 3: Create migration for invoice fields

**Files:**
- Create: `supabase/migrations/006_midtrans_invoice_fields.sql`

- [ ] **Step 1: Write migration file**

```sql
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS midtrans_invoice_id text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_pdf_url text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_payment_link_url text;
```

- [ ] **Step 2: Verify migration content**

Run: `node -e "const fs = require('fs'); const c = fs.readFileSync('supabase/migrations/006_midtrans_invoice_fields.sql','utf8'); ['midtrans_invoice_id','midtrans_invoice_pdf_url','midtrans_invoice_payment_link_url'].forEach(col => { if (!c.includes(col)) { console.error('MISSING:', col); process.exit(1); } }); console.log('PASS');"`

Expected: `PASS`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_midtrans_invoice_fields.sql
git commit -m "feat: add Midtrans invoice fields migration"
```

---

### Task 4: Update `createMidtransSnapCheckout` to accept optional orderId

**Files:**
- Modify: `src/lib/billing/midtrans.js`

**Note:** Line numbers below are approximate after Tasks 1-2. Use the exact string matching shown; do not rely on absolute line numbers.

- [ ] **Step 1: Change function signature**

Find: `export async function createMidtransSnapCheckout({ planId, billingCycle, user, env = process.env }) {`

Replace with: `export async function createMidtransSnapCheckout({ planId, billingCycle, user, env = process.env, orderId = null }) {`

- [ ] **Step 2: Replace order ID generation logic**

Find the block:
```javascript
  const timestamp = Date.now();
  const userPrefix = String(user?.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12) || 'user';
  const orderId = `ww_${userPrefix}_${plan.id}_${cycle}_${timestamp}`;
```

Replace with:
```javascript
  const id = orderId || generateOrderId(user?.id, plan.id, cycle);
```

- [ ] **Step 3: Replace all internal `orderId` variable references with `id`**

Within the function body only, replace each `orderId` (lowercase 'd') variable reference with `id`. **Do not** change string keys like `'order_id'` or object property names.

The affected lines are:
- `order_id: orderId` → `order_id: id`
- `buildMidtransReturnUrl(orderId, env)` → `buildMidtransReturnUrl(id, env)`
- `{ orderId }` in error logs → `{ orderId: id }`
- `orderId: orderId` in return statement → `orderId: id`

Use edit tool with `replaceAll: false` targeting each occurrence individually, providing enough surrounding context to match uniquely.

- [ ] **Step 4: Verify the function still parses**

Run: `node -e "import('./src/lib/billing/midtrans.js').then(m => console.log('EXPORTS:', Object.keys(m).filter(k => typeof m[k] === 'function').join(', ')))"`

Expected: Output lists `createMidtransSnapCheckout` among exports. No syntax error.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/midtrans.js
git commit -m "feat: accept optional orderId in createMidtransSnapCheckout"
```

---

### Task 5: Update checkout route to use short order IDs and create Midtrans Invoice

**Files:**
- Modify: `src/app/api/billing/checkout/route.js`

- [ ] **Step 1: Update import**

Find: `import { createMidtransSnapCheckout } from '@/lib/billing/midtrans';`

Replace with: `import { createMidtransSnapCheckout, createMidtransInvoice, generateOrderId } from '@/lib/billing/midtrans';`

- [ ] **Step 2: Generate short order ID before checkout call**

After the line `const plan = getPlanConfig(planId);` and before `const requestOrigin = getRequestOrigin(req);`, insert:

```javascript
  const orderId = generateOrderId(auth.user.id, planId, billingCycle);
```

- [ ] **Step 3: Pass orderId to Snap checkout**

Find: `const checkout = await createMidtransSnapCheckout({ planId, billingCycle, user: auth.user, env: checkoutEnv });`

Replace with: `const checkout = await createMidtransSnapCheckout({ planId, billingCycle, user: auth.user, env: checkoutEnv, orderId });`

- [ ] **Step 4: Use local orderId in orderRecord**

Find: `order_id: checkout.orderId,`

Replace with: `order_id: orderId,`

- [ ] **Step 5: Create Midtrans Invoice after Snap success**

After the `orderRecord` closing `};` and before `let { error: orderError } = await auth.supabase.from('billing_orders').insert(orderRecord);`, insert:

```javascript
  const invoice = await createMidtransInvoice({ orderId, planId, billingCycle, user: auth.user, env: checkoutEnv });
  if (invoice.success) {
    orderRecord.midtrans_invoice_id = invoice.invoice_id;
    orderRecord.midtrans_invoice_pdf_url = invoice.pdf_url;
    orderRecord.midtrans_invoice_payment_link_url = invoice.payment_link_url;
  }
```

- [ ] **Step 6: Update fallback regex to include invoice columns**

Find: `if (orderError && /midtrans_(redirect_url|snap_token)/i.test(orderError.message || '')) {`

Replace with: `if (orderError && /midtrans_(?:redirect_url|snap_token|invoice_)/i.test(orderError.message || '')) {`

- [ ] **Step 7: Update fallback destructure to include invoice fields**

Find: `const { midtrans_redirect_url, midtrans_snap_token, ...legacyOrderRecord } = orderRecord;`

Replace with: `const { midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id, midtrans_invoice_pdf_url, midtrans_invoice_payment_link_url, ...legacyOrderRecord } = orderRecord;`

- [ ] **Step 8: Update error log reference**

Find: `console.error('Failed to store Midtrans billing order', { orderId: checkout.orderId, error: orderError.message });`

Replace with: `console.error('Failed to store Midtrans billing order', { orderId, error: orderError.message });`

- [ ] **Step 9: Verify checkout route parses**

Run: `node -e "import('./src/app/api/billing/checkout/route.js').then(m => console.log('OK')).catch(e => { console.error(e.message); process.exit(1); })"`

Expected: `OK`.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/billing/checkout/route.js
git commit -m "feat: create Midtrans Invoice at checkout, store invoice fields"
```

---

### Task 6: Update invoice route to use Midtrans Invoice API

**Files:**
- Modify: `src/app/api/account/invoices/[orderId]/route.js`

- [ ] **Step 1: Update imports**

Find: `import { getMidtransConfig } from '@/lib/billing/midtrans';`

Replace with: `import { getMidtransConfig, fetchMidtransInvoice, buildMidtransInvoiceUrl } from '@/lib/billing/midtrans';`

- [ ] **Step 2: Add `pickInvoiceUrl` helper**

Insert after the `buildSnapUrl` function body (after its closing `}`):

```javascript
function pickInvoiceUrl(invoiceData) {
  if (!invoiceData) return '';
  return invoiceData.pdf_url
    || invoiceData.paid_pdf_url
    || invoiceData.quotation_pdf_url
    || invoiceData.payment_link_url
    || '';
}
```

- [ ] **Step 3: Update orderLinks query to include invoice fields**

Find: `.select('midtrans_redirect_url, midtrans_snap_token')`

Replace with: `.select('midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id')`

- [ ] **Step 4: Insert Midtrans Invoice API call before the Snap fallback**

Find:
```javascript
  const config = getMidtransConfig();
  if (config.checkoutConfigured) {
    const status = await fetchMidtransStatus(orderId, config);
    const statusUrl = status ? pickMidtransUrl(status) : '';
    if (statusUrl) return NextResponse.json({ success: true, midtransUrl: statusUrl, source: 'midtrans_status' });
  }
```

Replace with:
```javascript
  const config = getMidtransConfig();

  if (orderLinks?.midtrans_invoice_id && config.checkoutConfigured) {
    const invoiceData = await fetchMidtransInvoice(orderLinks.midtrans_invoice_id, config);
    const invoiceUrl = pickInvoiceUrl(invoiceData);
    if (invoiceUrl) {
      return NextResponse.json({ success: true, midtransUrl: invoiceUrl, source: 'midtrans_invoice' });
    }
  }

  if (config.checkoutConfigured) {
    const status = await fetchMidtransStatus(orderId, config);
    const statusUrl = status ? pickMidtransUrl(status) : '';
    if (statusUrl) return NextResponse.json({ success: true, midtransUrl: statusUrl, source: 'midtrans_status' });
  }
```

**Note:** The old Snap status call is preserved as fallback. The Snap redirect/token fallback lines below remain unchanged.

- [ ] **Step 5: Verify invoice route parses**

Run: `node -e "import('./src/app/api/account/invoices/[orderId]/route.js').then(m => console.log('OK')).catch(e => { console.error(e.message); process.exit(1); })"`

Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/account/invoices/[orderId]/route.js
git commit -m "feat: fetch official Midtrans invoice via stored invoice ID"
```

---

### Task 7: Update verification script, run verification + build

**Files:**
- Modify: `scripts/verify-account-invoice-pdf.mjs`

- [ ] **Step 1: Add midtrans.js to files map**

Add after `migration: 'supabase/migrations/005_midtrans_order_links.sql'` (line 15):
```javascript
  midtrans: 'src/lib/billing/midtrans.js',
```

- [ ] **Step 2: Read midtrans.js content**

Add after `const migration = ...` (line 28):
```javascript
const midtrans = existsSync(join(root, files.midtrans)) ? read(files.midtrans) : '';
```

- [ ] **Step 3: Replace the expectations array**

Replace the entire `expectations` array (currently lines 30-55) with:

```javascript
const expectations = [
  ['pdf-lib dependency removed', pkg, '"pdf-lib"', false],
  ['invoice route does not import PDFDocument', route, 'PDFDocument', false],
  ['invoice route imports getMidtransConfig', route, 'getMidtransConfig'],
  ['invoice route imports fetchMidtransInvoice', route, 'fetchMidtransInvoice'],
  ['invoice route imports buildMidtransInvoiceUrl', route, 'buildMidtransInvoiceUrl'],
  ['invoice route authenticates user', route, 'getAuthenticatedUser'],
  ['invoice route queries billing orders', route, ".from('billing_orders')"],
  ['invoice route ownership query uses legacy-safe columns', route, ".select('order_id, owner_id')"],
  ['invoice route reads invoice ID from orderLinks', route, "select('midtrans_redirect_url, midtrans_snap_token, midtrans_invoice_id')"],
  ['invoice route scopes owner', route, ".eq('owner_id', auth.user.id)"],
  ['invoice route scopes order id', route, ".eq('order_id', orderId)"],
  ['invoice route fetches Midtrans invoice API', route, '/v1/invoices/'],
  ['invoice route uses pickInvoiceUrl with pdf_url', route, 'pdf_url'],
  ['invoice route falls back to Snap status', route, '/v2/${orderId}/status'],
  ['invoice route returns Midtrans URL JSON', route, 'midtransUrl'],
  ['invoice route no-url response is JSON error', route, "return NextResponse.json({ success: false, error: 'Midtrans receipt page is not available for this order.' });"],
  ['checkout imports generateOrderId', checkout, 'generateOrderId'],
  ['checkout imports createMidtransInvoice', checkout, 'createMidtransInvoice'],
  ['checkout calls generateOrderId', checkout, 'generateOrderId(auth.user.id, planId, billingCycle)'],
  ['checkout stores Midtrans redirect URL', checkout, 'midtrans_redirect_url: checkout.checkoutUrl'],
  ['checkout stores Midtrans token', checkout, 'midtrans_snap_token: checkout.token'],
  ['checkout stores invoice ID', checkout, 'midtrans_invoice_id: invoice.invoice_id'],
  ['checkout stores invoice PDF URL', checkout, 'midtrans_invoice_pdf_url: invoice.pdf_url'],
  ['checkout stores invoice payment link URL', checkout, 'midtrans_invoice_payment_link_url: invoice.payment_link_url'],
  ['checkout fallback regex includes invoice fields', checkout, 'midtrans_(?:redirect_url|snap_token|invoice_)'],
  ['checkout fallback destructures invoice fields', checkout, 'midtrans_invoice_id, midtrans_invoice_pdf_url, midtrans_invoice_payment_link_url'],
  ['migration adds redirect URL column', migration, 'midtrans_redirect_url'],
  ['migration adds snap token column', migration, 'midtrans_snap_token'],
  ['migration adds invoice ID column', migration, 'midtrans_invoice_id'],
  ['migration adds invoice PDF URL column', migration, 'midtrans_invoice_pdf_url'],
  ['migration adds invoice payment link URL column', migration, 'midtrans_invoice_payment_link_url'],
  ['midtrans.js exports generateOrderId', midtrans, 'export function generateOrderId'],
  ['midtrans.js exports createMidtransInvoice', midtrans, 'export async function createMidtransInvoice'],
  ['midtrans.js exports fetchMidtransInvoice', midtrans, 'export async function fetchMidtransInvoice'],
  ['midtrans.js exports buildMidtransInvoiceUrl', midtrans, 'export function buildMidtransInvoiceUrl'],
  ['midtrans.js Snap checkout accepts optional orderId', midtrans, 'orderId = null'],
  ['settings has download handler', settings, 'handleDownloadInvoice'],
  ['settings fetches invoice route', settings, '/api/account/invoices/'],
  ['settings opens Midtrans URL', settings, 'window.open(data.midtransUrl'],
  ['settings handles success false JSON', settings, '!data.success || !data.midtransUrl'],
  ['settings does not download blob', settings, 'response.blob()', false],
  ['settings invoice rows are buttons', settings, 'className={styles.invoiceItem}'],
  ['settings has download error text', translations, 'invoiceDownloadError'],
  ['css plan value has spacing class', css, '.planValue'],
  ['css invoice row cursor pointer', css, 'cursor: pointer'],
];
```

- [ ] **Step 4: Also update the migration file reference to include both migrations**

Update the `files.migration` path to read the new migration file instead of just `005`. Since the verification needs to check both, change line 15 from:
```javascript
  migration: 'supabase/migrations/005_midtrans_order_links.sql',
```
to read both files. Add a second migration reference:
```javascript
  migration005: 'supabase/migrations/005_midtrans_order_links.sql',
  migration006: 'supabase/migrations/006_midtrans_invoice_fields.sql',
```

And add reading for migration006 (after line 28):
```javascript
const migration006 = existsSync(join(root, files.migration006)) ? read(files.migration006) : '';
```

Update expectations that reference `migration` to use `migration005` and add new checks using `migration006`:

```javascript
  ['migration005 adds redirect URL column', migration005, 'midtrans_redirect_url'],
  ['migration005 adds snap token column', migration005, 'midtrans_snap_token'],
  ['migration006 adds invoice ID column', migration006, 'midtrans_invoice_id'],
  ['migration006 adds invoice PDF URL column', migration006, 'midtrans_invoice_pdf_url'],
  ['migration006 adds invoice payment link URL column', migration006, 'midtrans_invoice_payment_link_url'],
```

- [ ] **Step 5: Run verification script — expect PASS**

Run: `node scripts/verify-account-invoice-pdf.mjs`

Expected: `Account invoice PDF verification passed.`

- [ ] **Step 6: Run `npm run build`**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/verify-account-invoice-pdf.mjs
git commit -m "test: update invoice verification for Midtrans Invoicing API"
```

---

### Task 8: Order ID generation unit verification

**Files:**
- Verify: `src/lib/billing/midtrans.js`

- [ ] **Step 1: Verify order ID length never exceeds 36**

Run: `node -e "import('./src/lib/billing/midtrans.js').then(m => { for (let i = 0; i < 100; i++) { const id = m.generateOrderId('abc123def456' + i, 'pro', 'annual'); if (id.length > 36) { console.error('TOO LONG:', id.length, id); process.exit(1); } } console.log('All 100 IDs under 36 chars'); })"`

Expected: `All 100 IDs under 36 chars`.

- [ ] **Step 2: Verify order IDs are unique**

Run: `node -e "import('./src/lib/billing/midtrans.js').then(m => { const ids = new Set(); for (let i = 0; i < 1000; i++) { ids.add(m.generateOrderId('user' + (i % 10), 'pro', 'monthly')); } if (ids.size !== 1000) { console.error('COLLISION:', ids.size, 'unique out of 1000'); process.exit(1); } console.log('1000 unique IDs generated'); })"`

Expected: `1000 unique IDs generated`.

- [ ] **Step 3: Commit** (no file changes needed — verification only; skip if no changes)

---

## Execution Order

Tasks 1-7 in strict sequence (each depends on previous). Task 8 can run anytime after Task 1.

Each task: implement → verify → commit.
