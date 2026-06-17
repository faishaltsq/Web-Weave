# Account Settings Invoice PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Current Plan spacing and let users download real PDF invoices by clicking invoice rows.

**Architecture:** Add a server-side authenticated invoice PDF route backed by `billing_orders`, using `pdf-lib` for real PDF generation. Update `SettingsModal` so invoice rows fetch the PDF blob and trigger download, while CSS adds readable spacing and clickable row states.

**Tech Stack:** Next.js App Router API routes, Supabase server auth, React client component, CSS modules, `pdf-lib`, static verification scripts, `npm run build`.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `pdf-lib` dependency via `npm install pdf-lib`.
- Create `src/app/api/account/invoices/[orderId]/route.js`: authenticated PDF invoice download route.
- Modify `src/components/SettingsModal.js`: add invoice download state/handler and render invoice rows as buttons.
- Modify `src/components/SettingsModal.module.css`: fix Current Plan spacing and clickable invoice row styles.
- Modify `src/lib/i18n/translations.js`: add EN/ID invoice download error/loading labels if needed.
- Create `scripts/verify-account-invoice-pdf.mjs`: static guardrail for PDF route and client invoice download.

---

### Task 1: Add Failing PDF Verification

**Files:**
- Create: `scripts/verify-account-invoice-pdf.mjs`

- [ ] **Step 1: Create static verification script**

Create `scripts/verify-account-invoice-pdf.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  pkg: 'package.json',
  route: 'src/app/api/account/invoices/[orderId]/route.js',
  settings: 'src/components/SettingsModal.js',
  css: 'src/components/SettingsModal.module.css',
  translations: 'src/lib/i18n/translations.js',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const pkg = existsSync(join(root, files.pkg)) ? read(files.pkg) : '';
const route = existsSync(join(root, files.route)) ? read(files.route) : '';
const settings = existsSync(join(root, files.settings)) ? read(files.settings) : '';
const css = existsSync(join(root, files.css)) ? read(files.css) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';

const expectations = [
  ['pdf-lib dependency exists', pkg, '"pdf-lib"'],
  ['invoice route imports PDFDocument', route, "import { PDFDocument"],
  ['invoice route authenticates user', route, 'getAuthenticatedUser'],
  ['invoice route queries billing orders', route, ".from('billing_orders')"],
  ['invoice route scopes owner', route, ".eq('owner_id', auth.user.id)"],
  ['invoice route scopes order id', route, ".eq('order_id', orderId)"],
  ['invoice route returns PDF content type', route, "'Content-Type': 'application/pdf'"],
  ['invoice route returns attachment filename', route, 'Content-Disposition'],
  ['settings has download handler', settings, 'handleDownloadInvoice'],
  ['settings fetches invoice route', settings, '/api/account/invoices/'],
  ['settings downloads blob', settings, 'response.blob()'],
  ['settings invoice rows are buttons', settings, 'className={styles.invoiceItem}'],
  ['settings has download error text', translations, 'invoiceDownloadError'],
  ['css plan value has spacing class', css, '.planValue'],
  ['css invoice row cursor pointer', css, 'cursor: pointer'],
];

for (const [label, source, token] of expectations) {
  if (!source.includes(token)) failures.push(`${label}: missing "${token}"`);
}

if (failures.length) {
  console.error('Account invoice PDF verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account invoice PDF verification passed.');
```

- [ ] **Step 2: Run verification and confirm RED**

Run:

```bash
node scripts/verify-account-invoice-pdf.mjs
```

Expected: fails because `pdf-lib`, invoice API route, client download handler, and spacing class do not exist yet.

---

### Task 2: Add Dependency and Invoice API Route

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/app/api/account/invoices/[orderId]/route.js`

- [ ] **Step 1: Install PDF dependency**

Run:

```bash
npm install pdf-lib
```

Expected: `package.json` and `package-lock.json` include `pdf-lib`.

- [ ] **Step 2: Create invoice PDF route**

Create `src/app/api/account/invoices/[orderId]/route.js`:

```js
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value || 0))}`;

function sanitizeFilename(value) {
  return String(value || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCycleLabel(value) {
  if (value === 'annual') return 'Annual';
  if (value === 'monthly') return 'Monthly';
  return value || '-';
}

async function buildInvoicePdf({ order, provider }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.15, 0.39, 0.92);
  const dark = rgb(0.08, 0.1, 0.18);
  const muted = rgb(0.38, 0.43, 0.52);

  page.drawText('WebWeave Invoice', { x: 48, y: 780, size: 24, font: bold, color: dark });
  page.drawText('AI web automation billing receipt', { x: 48, y: 754, size: 11, font, color: muted });
  page.drawText(formatRupiah(order.amount), { x: 390, y: 775, size: 22, font: bold, color: blue });

  const rows = [
    ['Order ID', order.order_id],
    ['Plan', order.plan],
    ['Billing cycle', getCycleLabel(order.billing_cycle)],
    ['Amount', formatRupiah(order.amount)],
    ['Status', order.status || '-'],
    ['Payment provider', provider || '-'],
    ['Created date', formatDate(order.created_at)],
  ];

  let y = 690;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 56, y, size: 10, font: bold, color: muted });
    page.drawText(String(value || '-'), { x: 190, y, size: 11, font, color: dark });
    y -= 34;
  }

  page.drawLine({ start: { x: 48, y: 720 }, end: { x: 547, y: 720 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  page.drawLine({ start: { x: 48, y: 180 }, end: { x: 547, y: 180 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  page.drawText('This receipt is generated from WebWeave billing records.', { x: 48, y: 150, size: 10, font, color: muted });
  page.drawText('WebWeave does not store card details. Payments are processed by Midtrans.', { x: 48, y: 132, size: 10, font, color: muted });

  return pdfDoc.save();
}

export async function GET(req, { params }) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const orderId = String(params?.orderId || '').trim();
  if (!orderId) return NextResponse.json({ success: false, error: 'Invoice order ID is required.' }, { status: 400 });

  try {
    const { data: order, error: orderError } = await auth.supabase
      .from('billing_orders')
      .select('order_id, plan, billing_cycle, amount, status, created_at')
      .eq('owner_id', auth.user.id)
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Invoice not found.' }, { status: 404 });
    }

    const { data: profile } = await auth.supabase
      .from('profiles')
      .select('billing_provider')
      .eq('id', auth.user.id)
      .single();

    const bytes = await buildInvoicePdf({ order, provider: profile?.billing_provider || 'midtrans' });
    const filename = `webweave-invoice-${sanitizeFilename(order.order_id)}.pdf`;

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run verification**

Run:

```bash
node scripts/verify-account-invoice-pdf.mjs
```

Expected: dependency and route checks pass; SettingsModal/CSS checks still fail.

---

### Task 3: Add Client Download Behavior and Spacing

**Files:**
- Modify: `src/components/SettingsModal.js`
- Modify: `src/components/SettingsModal.module.css`
- Modify: `src/lib/i18n/translations.js`

- [ ] **Step 1: Add i18n keys**

In `en.settings`, add:

```js
invoiceDownloading: 'Downloading invoice...',
invoiceDownloadError: 'Unable to download invoice.',
```

In `id.settings`, add:

```js
invoiceDownloading: 'Mengunduh invoice...',
invoiceDownloadError: 'Gagal mengunduh invoice.',
```

- [ ] **Step 2: Add state and handler in SettingsModal**

In `src/components/SettingsModal.js`, add state near billing state:

```js
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState('');
  const [invoiceDownloadError, setInvoiceDownloadError] = useState('');
```

Add handler before `return`:

```js
  const handleDownloadInvoice = async (orderId) => {
    if (!orderId || downloadingInvoiceId) return;
    setDownloadingInvoiceId(orderId);
    setInvoiceDownloadError('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/account/invoices/${encodeURIComponent(orderId)}`, { headers });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t('settings.invoiceDownloadError'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `webweave-invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setInvoiceDownloadError(err.message || t('settings.invoiceDownloadError'));
    } finally {
      setDownloadingInvoiceId('');
    }
  };
```

- [ ] **Step 3: Fix Current Plan markup spacing**

Change plan summary inner div from:

```jsx
<div>
  <span>{t('settings.currentPlan')}</span>
  <strong>{billing?.planLabel || t('pricing.freePlan')}</strong>
</div>
```

to:

```jsx
<div className={styles.planText}>
  <span>{t('settings.currentPlan')}</span>
  <strong className={styles.planValue}>{billing?.planLabel || t('pricing.freePlan')}</strong>
</div>
```

- [ ] **Step 4: Change invoice rows to buttons**

Replace invoice row opening/closing markup:

```jsx
<div key={order.orderId} className={styles.invoiceItem}>
```

with:

```jsx
<button
  key={order.orderId}
  type="button"
  className={styles.invoiceItem}
  onClick={() => handleDownloadInvoice(order.orderId)}
  disabled={Boolean(downloadingInvoiceId)}
  title={t('settings.invoiceDownloading')}
>
```

Replace the matching closing `</div>` after `.invoiceRight` with `</button>`.

After invoice list, render error:

```jsx
{invoiceDownloadError && <div className={styles.billingError}>{invoiceDownloadError}</div>}
```

- [ ] **Step 5: Add CSS spacing/clickable styles**

In `SettingsModal.module.css`, add:

```css
.planText {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.planValue {
  display: block;
}
```

Update `.invoiceItem` to include button reset/click behavior:

```css
.invoiceItem {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
  color: inherit;
  padding: 0.75rem;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.invoiceItem:hover:not(:disabled) {
  border-color: var(--blue);
  background: var(--surface-3);
  transform: translateY(-1px);
}

.invoiceItem:disabled {
  cursor: wait;
  opacity: 0.75;
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
node scripts/verify-account-invoice-pdf.mjs
node scripts/verify-account-settings-billing.mjs
```

Expected: both pass.

---

### Task 4: Final Verification and Commit

**Files:**
- Read all changed files.

- [ ] **Step 1: Run full checks**

Run:

```bash
node scripts/verify-account-invoice-pdf.mjs
node scripts/verify-account-settings-billing.mjs
npm run build
```

Expected: verification scripts pass and build exits `0`.

- [ ] **Step 2: Review diff**

Run:

```bash
git diff --stat
git diff -- package.json src/app/api/account/invoices/[orderId]/route.js src/components/SettingsModal.js src/components/SettingsModal.module.css src/lib/i18n/translations.js scripts/verify-account-invoice-pdf.mjs
```

Expected: only PDF invoice route, invoice download UI, spacing, translations, dependency, and verification changed.

- [ ] **Step 3: Commit and push**

Run:

```bash
git add package.json package-lock.json scripts/verify-account-invoice-pdf.mjs src/app/api/account/invoices/[orderId]/route.js src/components/SettingsModal.js src/components/SettingsModal.module.css src/lib/i18n/translations.js
git commit -m "feat: add account invoice PDF downloads"
git push origin master
```

Expected: commit succeeds and `master -> master` push succeeds.
