# Templates Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace disabled sidebar "Templates" button with working Templates page showing admin-curated prompt templates that auto-fill the generator form.

**Architecture:** New `TemplatesPage` component reads templates from `WebWeaveContext`, renders as filterable card grid. Clicking a card calls `setObjective` + `setFramework` + navigates to home. Templates fetched once at app mount via context. Read-only API returns public templates from Supabase.

**Tech Stack:** Next.js 14 App Router, React 18, Supabase (RLS), CSS Modules, Lucide React

---

### File Structure

**Create:**
| File | Responsibility |
|---|---|
| `src/components/TemplatesPage.js` | Main page: category tabs, search, card grid, empty/loading states |
| `src/components/TemplatesPage.module.css` | Page styles (follows ScriptsPage.module.css conventions) |
| `src/app/api/templates/route.js` | GET endpoint — returns public templates from Supabase |

**Modify:**
| File | Change |
|---|---|
| `src/app/(main)/page.js` | Add `templates` activeView, enable sidebar nav button, pass `onUseTemplate` callback |
| `src/lib/context/WebWeaveContext.js` | Add `templates` state + `fetchTemplates()` + expose in provider value |
| `src/lib/i18n/translations.js` | Add `templates` translation keys (en + id) |
| `src/middleware.js` | Add `/templates` to `SPA_ROUTES` array |

---

### Task 1: Add templates translation strings

**Files:**
- Modify: `src/lib/i18n/translations.js`

- [ ] **Step 1: Add templates keys to en + id translations**

In `src/lib/i18n/translations.js`, add after the `sidebar` block (before line 50):

```js
    templates: {
      title: 'Templates',
      searchPlaceholder: 'Search templates...',
      categories: {
        all: 'All',
        login: 'Login',
        forms: 'Forms',
        e2e: 'E2E',
        api: 'API',
        navigation: 'Navigation',
      },
      useTemplate: 'Use Template',
      empty: 'No templates found matching your search.',
      error: 'Failed to load templates.',
    },
```

Add matching `id` block in the `id` section:

```js
    templates: {
      title: 'Template',
      searchPlaceholder: 'Cari template...',
      categories: {
        all: 'Semua',
        login: 'Login',
        forms: 'Formulir',
        e2e: 'E2E',
        api: 'API',
        navigation: 'Navigasi',
      },
      useTemplate: 'Gunakan Template',
      empty: 'Tidak ada template yang cocok.',
      error: 'Gagal memuat template.',
    },
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/i18n/translations.js
git commit -m "feat: add templates translation strings"
```

---

### Task 2: Add templates API route

**Files:**
- Create: `src/app/api/templates/route.js`

- [ ] **Step 1: Create the GET route**

Create `src/app/api/templates/route.js`:

```js
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, hasSupabaseServerConfig } from '@/lib/supabase/server';

export async function GET() {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, templates: [] });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, prompt, framework, category')
    .eq('visibility', 'public')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, configured: true, templates: data || [] });
}
```

- [ ] **Step 2: Verify route exists**

```bash
dir src\app\api\templates\route.js
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/templates/route.js
git commit -m "feat: add templates API route"
```

---

### Task 3: Add templates to WebWeaveContext

**Files:**
- Modify: `src/lib/context/WebWeaveContext.js`

- [ ] **Step 1: Add templates state and fetch function**

In `src/lib/context/WebWeaveContext.js`, after line 20 (`const [pendingScript, setPendingScript] = useState(null);`), add:

```js
  const [templates, setTemplates] = useState([]);
```

After the `loadPrivateData` function (after line 65), add `fetchTemplates`:

```js
  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/templates', { headers });
      const data = await res.json();
      if (data.success) setTemplates(data.templates || []);
    } catch {}
  }, [supabase, getAuthHeaders]);
```

- [ ] **Step 2: Add fetchTemplates call on user load**

Inside the existing `useEffect` at line 67-76, add `fetchTemplates()` call. Change:

```js
    loadPrivateData();
  }, [user, loadPrivateData]);
```

To:

```js
    loadPrivateData();
    fetchTemplates();
  }, [user, loadPrivateData, fetchTemplates]);
```

- [ ] **Step 3: Add templates to the context value**

In the `useMemo` return value (line 85-92), after `pendingScript, setPendingScript,` add:

```js
    templates, setTemplates, fetchTemplates,
```

Full updated `useMemo` block:

```js
  const value = useMemo(() => ({
    supabase, SUPABASE_ENABLED, user, setUser, authSessionLoading,
    projects, setProjects, scripts, setScripts, historyLoading,
    usageStatus, setUsageStatus, selectedProjectId, setSelectedProjectId,
    activeScriptId, setActiveScriptId,
    pendingScript, setPendingScript,
    templates, setTemplates, fetchTemplates,
    loadPrivateData, getAuthHeaders,
  }), [supabase, SUPABASE_ENABLED, user, authSessionLoading, projects, scripts, historyLoading, usageStatus, selectedProjectId, activeScriptId, pendingScript, templates, fetchTemplates, loadPrivateData, getAuthHeaders]);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/context/WebWeaveContext.js
git commit -m "feat: add templates state and fetchTemplates to context"
```

---

### Task 4: Create TemplatesPage component

**Files:**
- Create: `src/components/TemplatesPage.js`
- Create: `src/components/TemplatesPage.module.css`

- [ ] **Step 1: Create TemplatesPage.module.css**

Create `src/components/TemplatesPage.module.css`:

```css
.container { min-height: 100vh; height: 100vh; overflow: auto; padding: 1.5rem; background: var(--bg); color: var(--text); }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border); }
.header h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 3rem); letter-spacing: -0.06em; }
.header p { margin: 0.35rem 0 0; color: var(--muted); }
.searchWrap { display: flex; align-items: center; gap: 0.5rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 13px; padding: 0.45rem 0.8rem; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.searchWrap:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18); }
.searchWrap svg { color: var(--muted); flex-shrink: 0; }
.searchWrap input { border: 0; background: transparent; color: var(--text); font-size: 0.87rem; width: 200px; outline: none; }
.searchWrap input::placeholder { color: var(--subtle); }
.tabs { display: flex; gap: 0.35rem; margin: 1rem 0; flex-wrap: wrap; }
.tab { border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem 0.85rem; font-size: 0.8rem; font-weight: 700; background: transparent; color: var(--muted); cursor: pointer; transition: all 0.2s ease; }
.tab:hover { border-color: var(--blue); color: var(--text); }
.tabActive { border-color: var(--blue); background: rgba(59, 130, 246, 0.12); color: var(--blue); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.9rem; }
.card { border: 1px solid var(--border); border-radius: 22px; background: linear-gradient(180deg, var(--surface), var(--surface-2)); box-shadow: 0 20px 50px var(--shadow); padding: 1.1rem; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease, border-color 0.22s ease; animation: cardFadeIn 0.45s ease both; }
.card:nth-child(1) { animation-delay: 0.05s; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.15s; }
.card:nth-child(4) { animation-delay: 0.2s; }
.card:nth-child(5) { animation-delay: 0.25s; }
.card:nth-child(6) { animation-delay: 0.3s; }
.card:nth-child(7) { animation-delay: 0.35s; }
.card:nth-child(8) { animation-delay: 0.4s; }
.card:nth-child(9) { animation-delay: 0.45s; }
.card:nth-child(10) { animation-delay: 0.5s; }
.card:nth-child(11) { animation-delay: 0.55s; }
.card:nth-child(12) { animation-delay: 0.6s; }
.card:hover { transform: translateY(-6px); border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 28px 60px var(--shadow); }
.card::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 42%); transition: opacity 0.3s ease; }
.card:hover::before { opacity: 1.4; }
.cardIcon { width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center; background: rgba(59, 130, 246, 0.16); color: var(--blue); font-size: 1.2rem; margin-bottom: 0.75rem; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease; }
.card:hover .cardIcon { transform: scale(1.12); background: rgba(59, 130, 246, 0.26); }
.card h3 { position: relative; margin: 0 0 0.35rem; font-size: 1rem; }
.card p { position: relative; color: var(--muted); font-size: 0.84rem; line-height: 1.55; min-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 0; }
.badge { display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.65rem; }
.badgePlaywright { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.3); }
.badgeCypress { background: rgba(96, 165, 250, 0.15); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); }
.badgeSelenium { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
.badgePuppeteer { background: rgba(167, 139, 250, 0.15); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.3); }
.useButton { position: relative; display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 10px; padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 700; background: rgba(59, 130, 246, 0.08); color: var(--blue); cursor: pointer; transition: all 0.2s ease; }
.useButton:hover { background: rgba(59, 130, 246, 0.18); border-color: var(--blue); }
.skeleton { border: 1px solid var(--border); border-radius: 22px; padding: 1.1rem; background: var(--surface); animation: shimmer 1.6s infinite; }
.skeletonLine { height: 14px; background: var(--surface-2); border-radius: 6px; margin-bottom: 0.5rem; }
.skeletonLineShort { width: 60%; }
.skeletonLineLong { width: 85%; }
.emptyState, .errorState { display: grid; place-items: center; text-align: center; gap: 0.8rem; padding: 3rem 1.5rem; margin-top: 1rem; color: var(--muted); min-height: 50vh; }
.emptyState svg, .errorState svg { color: var(--subtle); }
.retryButton { border: 1px solid var(--border); border-radius: 10px; padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 700; background: var(--surface-2); color: var(--text); cursor: pointer; transition: all 0.2s ease; }
.retryButton:hover { border-color: var(--blue); }
@keyframes cardFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
@media (max-width: 1024px) { .container { min-height: 100dvh; height: auto; overflow-x: hidden; } .grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); } .header { flex-direction: column; } }
```

- [ ] **Step 2: Create TemplatesPage.js**

Create `src/components/TemplatesPage.js`:

```js
'use client';

import { useState, useMemo } from 'react';
import { Code2, KeyRound, FileText, ShoppingCart, Globe, Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import styles from './TemplatesPage.module.css';

const CATEGORY_ICONS = {
  login: KeyRound,
  forms: FileText,
  e2e: ShoppingCart,
  api: Code2,
  navigation: Globe,
};

const CATEGORIES = ['all', 'login', 'forms', 'e2e', 'api', 'navigation'];

const FRAMEWORK_CLASS = {
  playwright_js: styles.badgePlaywright,
  playwright_python: styles.badgePlaywright,
  puppeteer_js: styles.badgePuppeteer,
  selenium_python: styles.badgeSelenium,
  cypress_js: styles.badgeCypress,
};

const FRAMEWORK_LABEL = {
  playwright_js: 'Playwright',
  playwright_python: 'Playwright',
  puppeteer_js: 'Puppeteer',
  selenium_python: 'Selenium',
  cypress_js: 'Cypress',
};

function TemplateCard({ template, onUse }) {
  const { t } = useLanguage();
  const Icon = CATEGORY_ICONS[template.category] || Code2;
  const badgeClass = FRAMEWORK_CLASS[template.framework] || '';
  const frameworkLabel = FRAMEWORK_LABEL[template.framework] || template.framework;

  return (
    <div className={styles.card} onClick={() => onUse(template)}>
      <div className={styles.cardIcon}><Icon size={20} /></div>
      {frameworkLabel && (
        <span className={`${styles.badge} ${badgeClass}`}>{frameworkLabel}</span>
      )}
      <h3>{template.name}</h3>
      <p>{template.prompt}</p>
      <button type="button" className={styles.useButton}>
        <Code2 size={14} /> {t('templates.useTemplate')}
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonLine} style={{ width: 38, height: 38, borderRadius: 14, marginBottom: '0.75rem' }} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} style={{ width: '70%' }} />
    </div>
  );
}

export default function TemplatesPage({ onUseTemplate }) {
  const { t } = useLanguage();
  const { templates, user } = useWebWeave();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState(false);

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch = !search || tpl.name.toLowerCase().includes(search.toLowerCase()) || tpl.prompt.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || tpl.category === category;
      return matchSearch && matchCategory;
    });
  }, [templates, search, category]);

  const renderContent = () => {
    if (error) {
      return (
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{t('templates.error')}</p>
          <button type="button" className={styles.retryButton} onClick={() => setError(false)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      );
    }

    if (!templates || templates.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Code2 size={40} />
          <p>{t('templates.empty')}</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Menu size={40} />
          <p>{t('templates.empty')}</p>
        </div>
      );
    }

    return (
      <div className={styles.grid}>
        {filtered.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} onUse={onUseTemplate} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{t('templates.title')}</h1>
          <p>Pick a template to jump-start your automation</p>
        </div>
        <div className={styles.searchWrap}>
          <Menu size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('templates.searchPlaceholder')}
          />
        </div>
      </header>

      <div className={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.tab} ${category === cat ? styles.tabActive : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? t('templates.categories.all') : t(`templates.categories.${cat}`)}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TemplatesPage.js src/components/TemplatesPage.module.css
git commit -m "feat: add TemplatesPage component with search, category tabs, card grid"
```

---

### Task 5: Wire Templates into page.js

**Files:**
- Modify: `src/app/(main)/page.js`

- [ ] **Step 1: Add TemplatesPage import**

In `src/app/(main)/page.js`, after line 42 (`import ScriptsPage from '@/components/ScriptsPage';`), add:

```js
import TemplatesPage from '@/components/TemplatesPage';
```

- [ ] **Step 2: Destructure templates from context**

In the `useWebWeave()` destructuring block (lines 78-84), after `pendingScript, setPendingScript,` add:

```js
    templates, fetchTemplates,
```

Full block becomes:

```js
  const {
    supabase, SUPABASE_ENABLED, user, setUser, authSessionLoading,
    projects, setProjects, scripts, setScripts, historyLoading,
    usageStatus, setUsageStatus, selectedProjectId, setSelectedProjectId,
    activeScriptId, setActiveScriptId, loadPrivateData,
    pendingScript, setPendingScript,
    templates, fetchTemplates,
  } = useWebWeave();
```

- [ ] **Step 3: Add deriveView case for /templates**

In the `deriveView` function (lines 124-129), add after the `/scripts` check:

```js
    if (path === '/templates') return 'templates';
```

Full `deriveView`:

```js
  const deriveView = (path) => {
    if (path === '/chats') return 'chats';
    if (path === '/projects') return 'projects';
    if (path === '/scripts') return 'scripts';
    if (path === '/templates') return 'templates';
    return 'home';
  };
```

- [ ] **Step 4: Add handleUseTemplate function**

After the `startNewAutomation` function (search for it around line 150-190), add this function. Find a good spot after the existing function declarations (around line 500-600 area where other handlers like `handleGenerate` are defined).

Add this function near the other handler functions (find `handleOpenScript` and add nearby):

```js
  const handleUseTemplate = (template) => {
    setObjective(template.prompt);
    setFramework(template.framework);
    setActiveView('home');
    window.history.pushState(null, '', '/');
  };
```

Find the exact insertion point by locating `handleOpenScript` or `startNewAutomation`:

Search for `const startNewAutomation` in page.js, add `handleUseTemplate` right after that function block:

```js
  const handleUseTemplate = (template) => {
    setObjective(template.prompt);
    setFramework(template.framework);
    setActiveView('home');
    window.history.pushState(null, '', '/');
  };
```

- [ ] **Step 5: Enable sidebar Templates button**

Replace line 734:

```js
            <button type="button" className={styles.navDisabled} aria-disabled="true" data-tooltip="Coming in new Updates"><Code2 size={18} /> <span>Templates</span></button>
```

With:

```js
            <button type="button" className={activeView === 'templates' ? styles.navActive : ''} onClick={() => { setActiveView('templates'); window.history.pushState(null, '', '/templates'); }} title="Templates"><Code2 size={18} /> <span>Templates</span></button>
```

- [ ] **Step 6: Add templates activeView rendering**

After line 857 (`) : activeView === 'scripts' ? (`, before `) : hasWorkspace ? (`), add:

```js
        ) : activeView === 'templates' ? (
          <TemplatesPage onUseTemplate={handleUseTemplate} />
```

The chain becomes:

```js
        {activeView === 'projects' ? (
          <ProjectsPage />
        ) : activeView === 'chats' ? (
          ...
        ) : activeView === 'scripts' ? (
          <ScriptsPage ... />
        ) : activeView === 'templates' ? (
          <TemplatesPage onUseTemplate={handleUseTemplate} />
        ) : hasWorkspace ? (
          ...
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(main\)/page.js
git commit -m "feat: wire TemplatesPage into main app with sidebar nav"
```

Or on Windows:

```bash
git add "src/app/(main)/page.js"
git commit -m "feat: wire TemplatesPage into main app with sidebar nav"
```

---

### Task 6: Add /templates to SPA routes middleware

**Files:**
- Modify: `src/middleware.js`

- [ ] **Step 1: Add /templates to SPA_ROUTES**

In `src/middleware.js`, change line 3 from:

```js
const SPA_ROUTES = ['/chats', '/projects', '/scripts'];
```

To:

```js
const SPA_ROUTES = ['/chats', '/projects', '/scripts', '/templates'];
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.js
git commit -m "feat: add /templates to SPA middleware rewrites"
```

---

### Task 7: Seed template data into Supabase

**Files:** None (SQL migration)

- [ ] **Step 1: Add category column to templates table**

Run via Supabase SQL Editor:

```sql
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS category text;
```

- [ ] **Step 2: Insert 12 seed templates**

Run via Supabase SQL Editor:

```sql
INSERT INTO public.templates (name, prompt, framework, visibility, category) VALUES
(
  'Login Test',
  'Generate a login automation script that tests both valid and invalid credentials. Verify success redirect after valid login, and error message display for invalid credentials. Include checks for password visibility toggle and "remember me" checkbox if present.',
  'playwright_js', 'public', 'login'
),
(
  'Login Test',
  'Generate a Cypress login test that validates email/password fields, tests invalid credentials show error, and verifies successful login redirects to dashboard. Use data-cy attributes for selectors.',
  'cypress_js', 'public', 'login'
),
(
  'Form Fill & Validation',
  'Generate a Playwright script that fills all input fields in a form, checks required field validation messages, tests email format validation, and verifies successful form submission with a success toast.',
  'playwright_js', 'public', 'forms'
),
(
  'Form Fill & Validation',
  'Generate a Selenium Python script that fills a multi-step registration form, validates each step, and confirms successful account creation. Handle dynamic dropdowns and date pickers.',
  'selenium_python', 'public', 'forms'
),
(
  'E2E Checkout Flow',
  'Generate an end-to-end Playwright test for an e-commerce checkout: add item to cart, proceed to checkout, fill shipping details, select payment method, and verify order confirmation page with order number.',
  'playwright_js', 'public', 'e2e'
),
(
  'E2E Registration Flow',
  'Generate a Cypress end-to-end test for user registration: visit signup page, fill all fields, verify email confirmation message, and test that duplicate email is rejected.',
  'cypress_js', 'public', 'e2e'
),
(
  'API Smoke Test',
  'Generate a Playwright script that tests critical API endpoints: GET health check returns 200, POST login returns auth token, authenticated GET returns user data. Use request context.',
  'playwright_js', 'public', 'api'
),
(
  'API CRUD Test',
  'Generate a Selenium Python script with API calls to test full CRUD: create resource via POST, verify with GET, update with PUT, delete with DELETE. Verify each response status and body.',
  'selenium_python', 'public', 'api'
),
(
  'Navigation & Links Check',
  'Generate a Playwright script that crawls all navigation links on the page, clicks each, and verifies no broken links (non-200 or error pages). Skip external links or test them as HEAD requests.',
  'playwright_js', 'public', 'navigation'
),
(
  'Navigation & Links Check',
  'Generate a Cypress test that verifies all main navigation items are clickable, check breadcrumb trail updates on navigation, and confirm active page indicators highlight correctly.',
  'cypress_js', 'public', 'navigation'
),
(
  'Table / Data Grid Validation',
  'Generate a Playwright script that validates a data table: check column headers exist, verify row count matches pagination, test sorting on each sortable column, and validate search/filter functionality.',
  'playwright_js', 'public', 'forms'
),
(
  'File Upload Test',
  'Generate a Puppeteer script that tests file upload: open upload dialog, select a file, verify file name appears, check upload progress indicator, and confirm success message after upload completes.',
  'puppeteer_js', 'public', 'forms'
);
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: seed 12 templates into database"
```

---

### Task 8: Verify end-to-end

- [ ] **Step 1: Start dev server and test**

```bash
npm run dev
```

Open `http://localhost:3000/templates` and verify:
- Templates page loads with 12 template cards
- Category tabs filter correctly
- Search filters by name and prompt
- Clicking "Use Template" navigates to home with objective and framework pre-filled
- Sidebar Templates button shows active state and navigates correctly
- Refreshing `/templates` in browser keeps the templates view
