# Account Settings Billing + Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Account Settings theme-aware and add a non-hardcoded Billing section backed by `/api/account/billing`.

**Architecture:** Extend the existing `SettingsModal` instead of introducing settings tabs. The modal fetches billing data only when a signed-in Supabase user is present, renders values from the API response, and opens existing Pricing UI through a parent callback. CSS uses existing theme variables so light mode and dark mode stay consistent.

**Tech Stack:** Next.js App Router, React client components, Supabase auth headers, existing WebWeave context, CSS modules, local i18n translations, static verification scripts, `npm run build`.

---

## File Structure

- Modify `src/components/SettingsModal.js`: add billing fetch state, formatting helpers, Billing section markup, and optional `onOpenPricing` prop.
- Modify `src/components/SettingsModal.module.css`: replace hardcoded dark colors with theme variables and add Billing section styles.
- Modify `src/app/(main)/page.js`: pass `handleOpenPricing` to `SettingsModal`.
- Modify `src/lib/i18n/translations.js`: add EN/ID settings billing copy and status labels.
- Create `scripts/verify-account-settings-billing.mjs`: static guardrails for data source, i18n, and theme variables.
- Run existing `scripts/verify-mobile-tablet-responsive.mjs` and `npm run build`.

---

### Task 1: Add Failing Verification Guardrail

**Files:**
- Create: `scripts/verify-account-settings-billing.mjs`
- Read: `src/components/SettingsModal.js`
- Read: `src/components/SettingsModal.module.css`
- Read: `src/lib/i18n/translations.js`

- [ ] **Step 1: Write the failing verification script**

Create `scripts/verify-account-settings-billing.mjs` with:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  settings: 'src/components/SettingsModal.js',
  css: 'src/components/SettingsModal.module.css',
  translations: 'src/lib/i18n/translations.js',
  page: 'src/app/(main)/page.js',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const settings = existsSync(join(root, files.settings)) ? read(files.settings) : '';
const css = existsSync(join(root, files.css)) ? read(files.css) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';
const page = existsSync(join(root, files.page)) ? read(files.page) : '';

const expectations = [
  ['SettingsModal accepts pricing handler', settings, 'onOpenPricing'],
  ['SettingsModal reads WebWeave auth context', settings, 'useWebWeave'],
  ['SettingsModal fetches billing endpoint', settings, "fetch('/api/account/billing'"],
  ['SettingsModal renders billing section', settings, "t('settings.billing')"],
  ['SettingsModal renders current plan', settings, "t('settings.currentPlan')"],
  ['SettingsModal renders expiration date', settings, "t('settings.expirationDate')"],
  ['SettingsModal renders payment method', settings, "t('settings.paymentMethod')"],
  ['SettingsModal renders invoices', settings, "t('settings.invoices')"],
  ['Main page passes pricing handler', page, 'onOpenPricing={handleOpenPricing}'],
  ['English billing copy exists', translations, "billing: 'Billing'"],
  ['Indonesian billing copy exists', translations, "billing: 'Billing'"],
  ['CSS uses themed modal surface', css, 'background: var(--surface)'],
  ['CSS uses themed section surface', css, 'background: var(--surface-2)'],
  ['CSS uses themed text', css, 'color: var(--text)'],
  ['CSS uses themed muted text', css, 'color: var(--muted)'],
  ['CSS uses themed borders', css, 'var(--border)'],
  ['CSS removed old dark modal background', css, 'rgba(10, 10, 10, 0.96)'],
  ['CSS removed old dark section background', css, 'rgba(20, 20, 20, 0.6)'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label.includes('removed');
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
}

if (failures.length) {
  console.error('Account Settings billing verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account Settings billing verification passed.');
```

- [ ] **Step 2: Run verification and confirm RED**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: fails with missing `useWebWeave`, billing endpoint, billing translations, and old CSS hardcoded backgrounds still present.

---

### Task 2: Add Billing Copy to i18n

**Files:**
- Modify: `src/lib/i18n/translations.js`

- [ ] **Step 1: Add English settings keys**

Inside `en.settings`, keep existing keys and add:

```js
billing: 'Billing',
billingDescription: 'View your plan, payment status, and recent invoices.',
currentPlan: 'Current plan',
billingCycle: 'Billing cycle',
expirationDate: 'Expiration date',
paymentMethod: 'Payment method',
invoices: 'Invoices',
usage: 'Usage',
remainingQuota: 'remaining',
projectLimit: 'Project limit',
frameworksAvailable: 'frameworks available',
managePlan: 'Manage plan',
noPaymentMethod: 'No payment method',
noExpiration: 'No expiration',
notAvailable: 'Not available',
noInvoices: 'No invoices yet.',
billingLoading: 'Loading billing...',
billingUnavailable: 'Billing is unavailable for this account.',
billingError: 'Unable to load billing data.',
monthlyCycle: 'Monthly',
annualCycle: 'Annual',
freeCycle: 'Free',
orderId: 'Order ID',
invoiceStatus: 'Status',
invoiceAmount: 'Amount',
invoiceDate: 'Date',
statusSettlement: 'Paid',
statusCapture: 'Paid',
statusPending: 'Pending',
statusCheckoutCreated: 'Checkout created',
statusExpire: 'Expired',
statusCancel: 'Cancelled',
statusDeny: 'Denied',
statusFailure: 'Failed',
statusRefund: 'Refunded',
```

- [ ] **Step 2: Add Indonesian settings keys**

Inside `id.settings`, keep existing keys and add:

```js
billing: 'Billing',
billingDescription: 'Lihat paket, status pembayaran, dan invoice terbaru kamu.',
currentPlan: 'Paket aktif',
billingCycle: 'Siklus billing',
expirationDate: 'Tanggal berakhir',
paymentMethod: 'Metode pembayaran',
invoices: 'Invoice',
usage: 'Pemakaian',
remainingQuota: 'tersisa',
projectLimit: 'Batas project',
frameworksAvailable: 'framework tersedia',
managePlan: 'Kelola paket',
noPaymentMethod: 'Belum ada metode pembayaran',
noExpiration: 'Tidak ada tanggal berakhir',
notAvailable: 'Tidak tersedia',
noInvoices: 'Belum ada invoice.',
billingLoading: 'Memuat billing...',
billingUnavailable: 'Billing tidak tersedia untuk akun ini.',
billingError: 'Gagal memuat data billing.',
monthlyCycle: 'Bulanan',
annualCycle: 'Tahunan',
freeCycle: 'Free',
orderId: 'Order ID',
invoiceStatus: 'Status',
invoiceAmount: 'Jumlah',
invoiceDate: 'Tanggal',
statusSettlement: 'Lunas',
statusCapture: 'Lunas',
statusPending: 'Menunggu',
statusCheckoutCreated: 'Checkout dibuat',
statusExpire: 'Expired',
statusCancel: 'Dibatalkan',
statusDeny: 'Ditolak',
statusFailure: 'Gagal',
statusRefund: 'Refund',
```

- [ ] **Step 3: Run verification and confirm translations errors disappear**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: still fails for modal implementation and CSS, but translation failures are gone.

---

### Task 3: Wire Settings Modal to Pricing Handler

**Files:**
- Modify: `src/app/(main)/page.js`

- [ ] **Step 1: Pass pricing handler into SettingsModal**

Find the existing `SettingsModal` render near the bottom of `src/app/(main)/page.js` and change it to:

```jsx
{showSettings && <SettingsModal onClose={() => setShowSettings(false)} onOpenPricing={handleOpenPricing} />}
```

- [ ] **Step 2: Run verification and confirm handler failure disappears**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: still fails for `SettingsModal` and CSS, but `Main page passes pricing handler` is no longer listed.

---

### Task 4: Implement Billing Data Fetch and Rendering

**Files:**
- Modify: `src/components/SettingsModal.js`

- [ ] **Step 1: Update imports**

Replace imports at top with:

```js
import { useEffect, useState } from 'react';
import { CreditCard, FileText, Globe, Loader, ReceiptText, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import styles from './SettingsModal.module.css';
```

- [ ] **Step 2: Add formatting helpers above component**

Add below imports:

```js
const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value || 0))}`;

function formatDate(value, lang) {
  if (!value) return '';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCycleLabel(cycle, t) {
  if (cycle === 'annual') return t('settings.annualCycle');
  if (cycle === 'monthly') return t('settings.monthlyCycle');
  return t('settings.freeCycle');
}

function getStatusLabel(status, t) {
  const statusMap = {
    settlement: t('settings.statusSettlement'),
    capture: t('settings.statusCapture'),
    pending: t('settings.statusPending'),
    checkout_created: t('settings.statusCheckoutCreated'),
    expire: t('settings.statusExpire'),
    cancel: t('settings.statusCancel'),
    deny: t('settings.statusDeny'),
    failure: t('settings.statusFailure'),
    refund: t('settings.statusRefund'),
  };
  return statusMap[status] || status || t('settings.notAvailable');
}
```

- [ ] **Step 3: Update component signature and context usage**

Change component start to:

```js
export default function SettingsModal({ onClose, onOpenPricing }) {
  const { lang, setLang, t } = useLanguage();
  const { SUPABASE_ENABLED, user, getAuthHeaders } = useWebWeave();
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
```

- [ ] **Step 4: Add billing fetch effect**

Add after state declarations:

```js
  useEffect(() => {
    let active = true;

    async function loadBilling() {
      if (!SUPABASE_ENABLED || !user) {
        setBilling(null);
        setBillingLoading(false);
        setBillingError('');
        return;
      }

      setBillingLoading(true);
      setBillingError('');

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/account/billing', { headers });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(data.error || t('settings.billingError'));
        }

        if (active) setBilling(data.billing || null);
      } catch (err) {
        if (active) {
          setBilling(null);
          setBillingError(err.message || t('settings.billingError'));
        }
      } finally {
        if (active) setBillingLoading(false);
      }
    }

    loadBilling();
    return () => { active = false; };
  }, [SUPABASE_ENABLED, user, getAuthHeaders, t]);
```

- [ ] **Step 5: Add render helpers inside component before return**

Add below the effect:

```js
  const isBillingUnavailable = !SUPABASE_ENABLED || !user;
  const quota = billing?.quota;
  const orders = Array.isArray(billing?.orders) ? billing.orders : [];
  const expiryLabel = billing?.billingPeriodEndsAt
    ? formatDate(billing.billingPeriodEndsAt, lang)
    : billing?.planId === 'free'
      ? t('settings.noExpiration')
      : t('settings.notAvailable');
  const paymentLabel = billing?.billingProvider || t('settings.noPaymentMethod');
```

- [ ] **Step 6: Add Billing section markup below Language section**

Insert this after the existing language section closing `</div>` and before modal closing tags:

```jsx
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CreditCard size={20} />
            <div>
              <h3>{t('settings.billing')}</h3>
              <p>{t('settings.billingDescription')}</p>
            </div>
          </div>

          {billingLoading ? (
            <div className={styles.billingState}>
              <Loader size={17} className={styles.spinner} />
              <span>{t('settings.billingLoading')}</span>
            </div>
          ) : billingError ? (
            <div className={styles.billingError}>{billingError}</div>
          ) : isBillingUnavailable ? (
            <div className={styles.billingState}>{t('settings.billingUnavailable')}</div>
          ) : (
            <div className={styles.billingContent}>
              <div className={styles.planSummary}>
                <div>
                  <span>{t('settings.currentPlan')}</span>
                  <strong>{billing?.planLabel || t('pricing.freePlan')}</strong>
                </div>
                {onOpenPricing && (
                  <button type="button" className={styles.manageButton} onClick={onOpenPricing}>
                    {t('settings.managePlan')}
                  </button>
                )}
              </div>

              <div className={styles.billingGrid}>
                <div className={styles.billingMetric}>
                  <span>{t('settings.billingCycle')}</span>
                  <strong>{getCycleLabel(billing?.billingCycle, t)}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.expirationDate')}</span>
                  <strong>{expiryLabel}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.paymentMethod')}</span>
                  <strong>{paymentLabel}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.usage')}</span>
                  <strong>{quota ? `${quota.used} / ${quota.limit}` : t('settings.notAvailable')}</strong>
                </div>
              </div>

              <div className={styles.usageStrip}>
                <span>{quota ? `${quota.remaining} ${t('settings.remainingQuota')}` : t('settings.notAvailable')}</span>
                <span>{t('settings.projectLimit')}: {billing?.projectLimit ?? t('settings.notAvailable')}</span>
                <span>{billing?.allowedFrameworks?.length ?? 0} {t('settings.frameworksAvailable')}</span>
              </div>

              <div className={styles.invoiceSection}>
                <div className={styles.invoiceHeader}>
                  <FileText size={16} />
                  <h4>{t('settings.invoices')}</h4>
                </div>
                {orders.length === 0 ? (
                  <div className={styles.emptyInvoices}>{t('settings.noInvoices')}</div>
                ) : (
                  <div className={styles.invoiceList}>
                    {orders.map((order) => (
                      <div key={order.orderId} className={styles.invoiceItem}>
                        <div className={styles.invoiceMain}>
                          <strong><ReceiptText size={14} /> {order.orderId}</strong>
                          <span>{order.plan} · {getCycleLabel(order.cycle, t)} · {formatDate(order.createdAt, lang)}</span>
                        </div>
                        <div className={styles.invoiceRight}>
                          <strong>{formatRupiah(order.amount)}</strong>
                          <span className={styles.invoiceStatus}>{getStatusLabel(order.status, t)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
```

- [ ] **Step 7: Run verification and confirm only CSS failures remain**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: fails only for CSS theme guardrails.

---

### Task 5: Make Settings Modal Theme-Aware and Add Billing Styles

**Files:**
- Modify: `src/components/SettingsModal.module.css`

- [ ] **Step 1: Replace modal and section hardcoded dark backgrounds**

Change `.modal` to use:

```css
.modal {
  position: relative;
  z-index: 1;
  width: min(680px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  padding: 1.5rem;
  box-shadow: 0 24px 80px var(--shadow), 0 0 0 1px rgba(59, 130, 246, 0.12);
  animation: slideUp 0.22s ease;
}
```

Change `.section` to:

```css
.section {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.2rem;
  background: var(--surface-2);
}
```

- [ ] **Step 2: Add modal content spacing**

Add after `.header` block:

```css
.modal > .section + .section {
  margin-top: 1rem;
}
```

- [ ] **Step 3: Add Billing section styles**

Add before mobile media query:

```css
.billingContent {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.billingState,
.billingError,
.emptyInvoices {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--muted);
  padding: 0.85rem;
  font-size: 0.86rem;
}

.billingState {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.billingError {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: var(--red);
}

.planSummary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 1rem;
}

.planSummary span,
.billingMetric span,
.usageStrip,
.invoiceMain span,
.invoiceStatus {
  color: var(--muted);
  font-size: 0.78rem;
}

.planSummary strong,
.billingMetric strong,
.invoiceMain strong,
.invoiceRight strong {
  color: var(--text);
}

.manageButton {
  border: 1px solid rgba(59, 130, 246, 0.55);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--blue);
  min-height: 36px;
  padding: 0 0.8rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 850;
  cursor: pointer;
}

.manageButton:hover {
  background: rgba(59, 130, 246, 0.18);
  border-color: var(--blue);
}

.billingGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.billingMetric {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.8rem;
}

.billingMetric span,
.billingMetric strong {
  display: block;
}

.billingMetric strong {
  margin-top: 0.25rem;
  font-size: 0.92rem;
}

.usageStrip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.usageStrip span {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  padding: 0.34rem 0.6rem;
}

.invoiceSection {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  padding: 0.9rem;
}

.invoiceHeader {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.7rem;
  color: var(--text);
}

.invoiceHeader h4 {
  margin: 0;
  font-size: 0.9rem;
}

.invoiceList {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.invoiceItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
  padding: 0.75rem;
}

.invoiceMain,
.invoiceRight {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.invoiceMain strong {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.84rem;
}

.invoiceRight {
  align-items: flex-end;
  text-align: right;
}

.invoiceStatus {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.14rem 0.45rem;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 4: Add mobile Billing styles**

Inside existing `@media (max-width: 520px)` add:

```css
  .planSummary,
  .invoiceItem {
    align-items: stretch;
    flex-direction: column;
  }

  .billingGrid {
    grid-template-columns: 1fr;
  }

  .invoiceRight {
    align-items: flex-start;
    text-align: left;
  }

  .manageButton {
    width: 100%;
  }
```

- [ ] **Step 5: Run verification and confirm Account Settings guardrail passes**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: `Account Settings billing verification passed.`

---

### Task 6: Regression Checks and Build

**Files:**
- Read: all modified files

- [ ] **Step 1: Run Account Settings verification**

Run:

```bash
node scripts/verify-account-settings-billing.mjs
```

Expected: `Account Settings billing verification passed.`

- [ ] **Step 2: Run mobile responsive verification**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
```

Expected: `Mobile/tablet responsive CSS verified.`

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build compiles successfully and exits `0`.

- [ ] **Step 4: Review diff**

Run:

```bash
git diff --stat
git diff -- src/components/SettingsModal.js src/components/SettingsModal.module.css src/lib/i18n/translations.js "src/app/(main)/page.js" scripts/verify-account-settings-billing.mjs
```

Expected: only Account Settings billing/theme, translations, parent prop wiring, and verification script changed.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add scripts/verify-account-settings-billing.mjs src/components/SettingsModal.js src/components/SettingsModal.module.css src/lib/i18n/translations.js "src/app/(main)/page.js"
git commit -m "feat: add billing to account settings"
```

Expected: commit succeeds.

- [ ] **Step 6: Push master**

Run:

```bash
git push origin master
```

Expected: `master -> master` push succeeds.
