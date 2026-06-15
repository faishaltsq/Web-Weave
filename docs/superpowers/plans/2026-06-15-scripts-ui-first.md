# Scripts UI-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paid-only `Scripts` sidebar view that previews future cloud script execution without implementing a runner.

**Architecture:** Reuse existing saved `generated_scripts` data from `WebWeaveContext`. Add plan-level script slot limits, a focused `ScriptsPage` component, and route/view wiring in the current SPA shell. Cloud run UI stays disabled and honest: `Coming soon`, no fake execution and no runner API.

**Tech Stack:** Next.js App Router, React client components, CSS modules, lucide-react, existing Supabase-backed context, existing i18n helper.

---

## File Structure

- Create `src/components/ScriptsPage.js`: UI-only paid/free Scripts page.
- Create `src/components/ScriptsPage.module.css`: Scripts-specific styling matching WebWeave dark/minimal theme.
- Modify `src/app/(main)/page.js`: Add `Scripts` sidebar item, `/scripts` view routing, and callbacks for pricing/chats/home navigation.
- Modify `src/lib/billing/plans.js`: Add `scriptSlotLimit` per plan and `getScriptSlotLimit()` helper.
- Modify `src/lib/i18n/translations.js`: Add EN/ID `scripts` copy.
- Create `scripts/verify-scripts-ui-first.mjs`: Static verification for no-runner UI behavior, nav, limits, and translations.

## Task 1: Static Verification First

**Files:**
- Create: `scripts/verify-scripts-ui-first.mjs`

- [ ] **Step 1: Add failing verification script**

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];

const files = {
  page: 'src/app/(main)/page.js',
  plans: 'src/lib/billing/plans.js',
  translations: 'src/lib/i18n/translations.js',
  scriptsPage: 'src/components/ScriptsPage.js',
  scriptsCss: 'src/components/ScriptsPage.module.css',
};

for (const [label, path] of Object.entries(files)) {
  if (!existsSync(join(root, path))) failures.push(`${label}: missing ${path}`);
}

const page = existsSync(join(root, files.page)) ? read(files.page) : '';
const plans = existsSync(join(root, files.plans)) ? read(files.plans) : '';
const translations = existsSync(join(root, files.translations)) ? read(files.translations) : '';
const scriptsPage = existsSync(join(root, files.scriptsPage)) ? read(files.scriptsPage) : '';
const scriptsCss = existsSync(join(root, files.scriptsCss)) ? read(files.scriptsCss) : '';

const expectations = [
  ['sidebar has Scripts nav item', page, 'Scripts</button>'],
  ['scripts route maps to view', page, "path === '/scripts'"],
  ['scripts view renders component', page, '<ScriptsPage'],
  ['Starter has 5 script slots', plans, 'scriptSlotLimit: 5'],
  ['Pro has 12 script slots', plans, 'scriptSlotLimit: 12'],
  ['script slot helper exported', plans, 'export function getScriptSlotLimit'],
  ['English scripts copy exists', translations, 'Cloud execution is being prepared'],
  ['Indonesian scripts copy exists', translations, 'Eksekusi cloud sedang disiapkan'],
  ['ScriptsPage exports component', scriptsPage, 'export default function ScriptsPage'],
  ['free users are locked', scriptsPage, "planId === 'free'"],
  ['Run in Cloud disabled', scriptsPage, 'disabled'],
  ['Coming soon label exists', scriptsPage, "t('scripts.comingSoon')"],
  ['ScriptsPage uses plan helper', scriptsPage, 'getScriptSlotLimit(planId)'],
  ['No runner API call', scriptsPage, "fetch('/api/scripts/run'"],
  ['Scripts card styles exist', scriptsCss, '.scriptCard'],
];

for (const [label, source, token] of expectations) {
  const shouldBeAbsent = label === 'No runner API call';
  const hasToken = source.includes(token);
  if (shouldBeAbsent ? hasToken : !hasToken) failures.push(`${label}: ${shouldBeAbsent ? 'must not include' : 'missing'} "${token}"`);
}

if (failures.length) {
  console.error('Scripts UI-first verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Scripts UI-first verification passed.');
```

- [ ] **Step 2: Run verification and confirm RED**

Run: `node scripts/verify-scripts-ui-first.mjs`

Expected: FAIL with missing `ScriptsPage`, missing `scriptSlotLimit`, missing nav, missing copy.

## Task 2: Plan Slot Limits

**Files:**
- Modify: `src/lib/billing/plans.js`

- [ ] **Step 1: Add script slot limits**

Update each plan object:

```js
free: {
  id: 'free',
  label: 'Free',
  monthlyGenerationLimit: 5,
  projectLimit: 1,
  scriptSlotLimit: 0,
  allowedFrameworks: ['playwright_js'],
  checkoutEnabled: false,
  publicEnabled: true,
  prices: {
    monthly: 0,
    annual: 0,
  },
},
starter: {
  id: 'starter',
  label: 'Starter',
  monthlyGenerationLimit: 75,
  projectLimit: 5,
  scriptSlotLimit: 5,
  allowedFrameworks: STARTER_FRAMEWORKS,
  checkoutEnabled: true,
  publicEnabled: true,
  prices: {
    monthly: 49000,
    annual: 470000,
  },
},
pro: {
  id: 'pro',
  label: 'Pro',
  monthlyGenerationLimit: 300,
  projectLimit: 25,
  scriptSlotLimit: 12,
  allowedFrameworks: SUPPORTED_FRAMEWORKS,
  checkoutEnabled: true,
  publicEnabled: true,
  prices: {
    monthly: 129000,
    annual: 1238000,
  },
},
team: {
  id: 'team',
  label: 'Team',
  monthlyGenerationLimit: 1000,
  projectLimit: 50,
  scriptSlotLimit: 0,
  allowedFrameworks: SUPPORTED_FRAMEWORKS,
  checkoutEnabled: false,
  publicEnabled: false,
  prices: {
    monthly: 299000,
    annual: 2870000,
  },
},
```

- [ ] **Step 2: Add helper**

Append after `getProjectLimit`:

```js
export function getScriptSlotLimit(planId) {
  return getPlanConfig(planId)?.scriptSlotLimit ?? WEBWEAVE_PLANS.free.scriptSlotLimit;
}
```

## Task 3: i18n Copy

**Files:**
- Modify: `src/lib/i18n/translations.js`

- [ ] **Step 1: Add English `scripts` section**

Add under English root object, near `sidebar` or `generate`:

```js
scripts: {
  title: 'Scripts',
  subtitle: 'Paid cloud automation library',
  lockedTitle: 'Cloud Scripts is a paid feature',
  lockedBody: 'Save scripts now and prepare them for future cloud execution with Starter or Pro.',
  upgradeStarter: 'Upgrade to Starter',
  viewPricing: 'View pricing',
  planSummary: 'Plan',
  slotsUsed: 'slots used',
  runnerStatus: 'Cloud runner',
  runnerPreparing: 'Preparing',
  runnerNotice: 'Cloud execution is being prepared. Save scripts now, run them later.',
  browseChats: 'Browse Chats',
  newAutomation: 'New Automation',
  emptyTitle: 'No saved scripts yet',
  emptyBody: 'Create an automation first, then saved scripts will appear here as cloud-ready candidates.',
  viewCode: 'View code',
  runInCloud: 'Run in Cloud',
  comingSoon: 'Coming soon',
  cloudReady: 'Cloud-ready candidate',
  lockedOverflow: 'Upgrade for more slots',
  signInTitle: 'Sign in to manage scripts',
  signInBody: 'Scripts uses your saved automation history.',
  supabaseDisabled: 'Supabase is not configured. Script library needs saved history.',
}
```

- [ ] **Step 2: Add Indonesian `scripts` section**

Add under Indonesian root object:

```js
scripts: {
  title: 'Scripts',
  subtitle: 'Library cloud automation untuk paid user',
  lockedTitle: 'Cloud Scripts khusus paid user',
  lockedBody: 'Simpan script sekarang dan siapkan untuk eksekusi cloud nanti dengan Starter atau Pro.',
  upgradeStarter: 'Upgrade ke Starter',
  viewPricing: 'Lihat pricing',
  planSummary: 'Paket',
  slotsUsed: 'slot terpakai',
  runnerStatus: 'Cloud runner',
  runnerPreparing: 'Sedang disiapkan',
  runnerNotice: 'Eksekusi cloud sedang disiapkan. Simpan script sekarang, jalankan nanti.',
  browseChats: 'Lihat Chats',
  newAutomation: 'Automation Baru',
  emptyTitle: 'Belum ada script tersimpan',
  emptyBody: 'Buat automation dulu, lalu script tersimpan akan muncul di sini sebagai kandidat cloud-ready.',
  viewCode: 'Lihat kode',
  runInCloud: 'Run di Cloud',
  comingSoon: 'Segera hadir',
  cloudReady: 'Kandidat cloud-ready',
  lockedOverflow: 'Upgrade untuk slot tambahan',
  signInTitle: 'Sign in untuk mengelola scripts',
  signInBody: 'Scripts memakai riwayat automation tersimpan kamu.',
  supabaseDisabled: 'Supabase belum dikonfigurasi. Script library membutuhkan riwayat tersimpan.',
}
```

## Task 4: ScriptsPage Component

**Files:**
- Create: `src/components/ScriptsPage.js`
- Create: `src/components/ScriptsPage.module.css`

- [ ] **Step 1: Create `ScriptsPage.js`**

```jsx
'use client';

import { Code2, Crown, FileCode2, Lock, Play, Sparkles, TerminalSquare } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import { getScriptSlotLimit } from '@/lib/billing/plans';
import styles from './ScriptsPage.module.css';

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || 'Saved script';
  }
}

function getScriptName(script) {
  const domain = extractDomain(script.target_url);
  const isRevision = (script.prompt || '').includes('Regeneration feedback');
  return `${domain}${isRevision ? ' (revisi)' : ''}`;
}

export default function ScriptsPage({ onOpenPricing, onNewAutomation, onBrowseChats, onOpenScript }) {
  const { t } = useLanguage();
  const { SUPABASE_ENABLED, user, scripts, historyLoading, usageStatus } = useWebWeave();
  const planId = usageStatus?.planId || 'free';
  const planLabel = usageStatus?.planLabel || 'Free';
  const slotLimit = getScriptSlotLimit(planId);
  const isPaid = planId !== 'free' && slotLimit > 0;
  const visibleScripts = scripts || [];
  const usedSlots = Math.min(visibleScripts.length, slotLimit);

  if (!SUPABASE_ENABLED) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>
          <Lock size={34} />
          <h1>{t('scripts.title')}</h1>
          <p>{t('scripts.supabaseDisabled')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>
          <Lock size={34} />
          <h1>{t('scripts.signInTitle')}</h1>
          <p>{t('scripts.signInBody')}</p>
        </div>
      </div>
    );
  }

  if (planId === 'free' || !isPaid) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}><FileCode2 size={15} /> {t('scripts.title')}</p>
            <h1>{t('scripts.lockedTitle')}</h1>
            <p>{t('scripts.lockedBody')}</p>
          </div>
        </header>
        <section className={styles.upgradePanel}>
          <div className={styles.upgradeIcon}><Crown size={26} /></div>
          <div>
            <h2>{t('scripts.subtitle')}</h2>
            <p>{t('scripts.runnerNotice')}</p>
          </div>
          <div className={styles.upgradeActions}>
            <button type="button" className={styles.primaryButton} onClick={onOpenPricing}>{t('scripts.upgradeStarter')}</button>
            <button type="button" className={styles.secondaryButton} onClick={onOpenPricing}>{t('scripts.viewPricing')}</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}><FileCode2 size={15} /> {t('scripts.title')}</p>
          <h1>{t('scripts.title')}</h1>
          <p>{t('scripts.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={onBrowseChats}>{t('scripts.browseChats')}</button>
          <button type="button" className={styles.primaryButton} onClick={onNewAutomation}><Sparkles size={16} /> {t('scripts.newAutomation')}</button>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}><span>{t('scripts.planSummary')}</span><strong>{planLabel}</strong></div>
        <div className={styles.summaryCard}><span>{t('scripts.slotsUsed')}</span><strong>{usedSlots}/{slotLimit}</strong></div>
        <div className={styles.summaryCard}><span>{t('scripts.runnerStatus')}</span><strong>{t('scripts.runnerPreparing')}</strong></div>
      </section>

      <div className={styles.runnerNotice}><TerminalSquare size={17} /> {t('scripts.runnerNotice')}</div>

      {historyLoading ? (
        <div className={styles.emptyState}>{t('common.loading')}</div>
      ) : visibleScripts.length === 0 ? (
        <div className={styles.emptyState}>
          <Code2 size={36} />
          <h2>{t('scripts.emptyTitle')}</h2>
          <p>{t('scripts.emptyBody')}</p>
          <button type="button" className={styles.primaryButton} onClick={onNewAutomation}>{t('scripts.newAutomation')}</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleScripts.map((script, index) => {
            const locked = index >= slotLimit;
            const preview = (script.prompt || '').replace('Regeneration feedback from previous output:', '').slice(0, 110).trim();
            const date = script.created_at ? new Date(script.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
            return (
              <article key={script.id} className={`${styles.scriptCard} ${locked ? styles.lockedCard : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.scriptIcon}><FileCode2 size={18} /></div>
                  <span className={styles.statusPill}>{locked ? t('scripts.lockedOverflow') : t('scripts.cloudReady')}</span>
                </div>
                <h3>{getScriptName(script)}</h3>
                <p>{preview}</p>
                <div className={styles.metaRow}>
                  <span>{script.framework?.replace(/_/g, ' ')}</span>
                  <span>{date}</span>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => onOpenScript(script)}>{t('scripts.viewCode')}</button>
                  <button type="button" className={styles.disabledRunButton} disabled><Play size={14} /> {t('scripts.comingSoon')}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `ScriptsPage.module.css`**

```css
.container { min-height: 100vh; height: 100vh; overflow: auto; padding: 1.5rem; background: var(--bg); color: var(--text); }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
.header h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 3rem); letter-spacing: -0.06em; }
.header p { margin: 0.35rem 0 0; color: var(--muted); }
.kicker { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--blue) !important; font-size: 0.78rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; }
.headerActions, .upgradeActions, .cardActions { display: flex; align-items: center; gap: 0.65rem; }
.primaryButton, .secondaryButton, .disabledRunButton { border-radius: 13px; min-height: 40px; padding: 0 0.9rem; font-weight: 850; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; cursor: pointer; }
.primaryButton { border: 1px solid rgba(59, 130, 246, 0.7); background: linear-gradient(135deg, #60a5fa, #2563eb); color: #fff; box-shadow: 0 16px 34px rgba(37, 99, 235, 0.28); }
.secondaryButton { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
.disabledRunButton { border: 1px solid rgba(148, 163, 184, 0.25); background: var(--surface-2); color: var(--muted); cursor: not-allowed; opacity: 0.72; }
.summaryGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; margin: 1rem 0; }
.summaryCard, .upgradePanel, .emptyState, .scriptCard, .runnerNotice { border: 1px solid var(--border); border-radius: 22px; background: linear-gradient(180deg, var(--surface), var(--surface-2)); box-shadow: 0 20px 50px var(--shadow); }
.summaryCard { padding: 1rem; }
.summaryCard span { display: block; color: var(--muted); font-size: 0.78rem; margin-bottom: 0.35rem; }
.summaryCard strong { font-size: 1.35rem; }
.runnerNotice { display: flex; align-items: center; gap: 0.65rem; padding: 0.85rem 1rem; color: var(--muted); margin-bottom: 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.9rem; }
.scriptCard { padding: 1rem; position: relative; overflow: hidden; }
.scriptCard::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 42%); }
.lockedCard { opacity: 0.62; }
.cardTop { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.9rem; }
.scriptIcon { width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center; background: rgba(59, 130, 246, 0.16); color: var(--blue); }
.statusPill { border: 1px solid var(--border); border-radius: 999px; padding: 0.28rem 0.55rem; color: var(--muted); font-size: 0.72rem; }
.scriptCard h3 { position: relative; margin: 0; font-size: 1rem; }
.scriptCard p { position: relative; min-height: 44px; color: var(--muted); font-size: 0.84rem; line-height: 1.55; }
.metaRow { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; color: var(--subtle); font-size: 0.75rem; margin: 0.85rem 0; text-transform: capitalize; }
.upgradePanel, .emptyState, .lockedState { display: grid; place-items: center; text-align: center; gap: 0.8rem; padding: 3rem 1.5rem; margin-top: 1rem; }
.upgradeIcon { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; background: rgba(59, 130, 246, 0.16); color: var(--blue); }
.lockedState { min-height: 70vh; color: var(--muted); }
.lockedState h1, .emptyState h2, .upgradePanel h2 { margin: 0; color: var(--text); }
@media (max-width: 760px) { .container { padding: 1rem; } .header { flex-direction: column; } .headerActions, .upgradeActions, .cardActions { width: 100%; flex-wrap: wrap; } .summaryGrid { grid-template-columns: 1fr; } .primaryButton, .secondaryButton, .disabledRunButton { flex: 1; } }
```

## Task 5: Sidebar and Route Wiring

**Files:**
- Modify: `src/app/(main)/page.js`

- [ ] **Step 1: Add imports**

Update lucide imports and component imports:

```js
  FileCode2,
```

Add component import:

```js
import ScriptsPage from '@/components/ScriptsPage';
```

- [ ] **Step 2: Add route mapping**

Update `deriveView`:

```js
  const deriveView = (path) => {
    if (path === '/chats') return 'chats';
    if (path === '/projects') return 'projects';
    if (path === '/scripts') return 'scripts';
    return 'home';
  };
```

- [ ] **Step 3: Add sidebar button**

In the nav list between Chats and Templates:

```jsx
<button type="button" className={activeView === 'scripts' ? styles.navActive : ''} onClick={() => { setActiveView('scripts'); window.history.pushState(null, '', '/scripts'); }}><FileCode2 size={18} /> Scripts</button>
```

- [ ] **Step 4: Render Scripts view**

Add route branch after Chats or before Home workspace branch:

```jsx
) : activeView === 'scripts' ? (
  <ScriptsPage
    onOpenPricing={handleOpenPricing}
    onNewAutomation={() => { startNewAutomation(); setActiveView('home'); window.history.pushState(null, '', '/'); }}
    onBrowseChats={() => { setActiveView('chats'); window.history.pushState(null, '', '/chats'); }}
    onOpenScript={(script) => { handleOpenScript(script); setActiveView('home'); window.history.pushState(null, '', '/'); }}
  />
```

## Task 6: Verify and Build

**Files:**
- All modified files

- [ ] **Step 1: Run Scripts UI verification**

Run: `node scripts/verify-scripts-ui-first.mjs`

Expected: `Scripts UI-first verification passed.`

- [ ] **Step 2: Run existing relevant verification**

Run: `node scripts/verify-saas-pricing-quota.mjs`

Expected: existing SaaS/pricing/quota verification passes. If this script expects exact plan objects and fails because of `scriptSlotLimit`, update its plan object parser expectations to include the new property rather than removing coverage.

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: Next build succeeds.

- [ ] **Step 4: Commit**

Run:

```bash
git add -A
git commit -m "feat: add scripts ui-first page"
```

Expected: commit succeeds with Scripts component, styles, nav wiring, plan limits, i18n copy, and verification script.

## Self-Review Notes

- Spec coverage: nav, access rules, Starter 5, Pro 12, UI-only runner placeholder, existing data model, and testing are covered.
- Scope: no runner API, no DB schema, no fake execution.
- Type/name consistency: uses `scriptSlotLimit`, `ScriptsPage`, `scripts.*` translation keys, and `activeView === 'scripts'` consistently.
