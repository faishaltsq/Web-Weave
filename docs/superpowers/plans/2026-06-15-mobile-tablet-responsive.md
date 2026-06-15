# Mobile Tablet Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WebWeave usable on phone and tablet with a persistent icon rail, no horizontal overflow, and responsive layouts across core pages and modals.

**Architecture:** Keep existing components and CSS modules. Make small JSX label/icon adjustments in the main shell, then add responsive CSS guardrails for app shell, workspace, page modules, and modals. Add a Node verification script that catches regressions in mobile rail and responsive CSS rules.

**Tech Stack:** Next.js App Router, React, CSS Modules, Node.js verification script, npm build.

---

## File Structure

- Create: `scripts/verify-mobile-tablet-responsive.mjs`
  - Reads target CSS/JS files and asserts responsive guardrails exist.
  - Fails before implementation and passes after responsive CSS/JS changes.
- Modify: `src/app/(main)/page.js`
  - Wrap sidebar navigation labels in `<span>` so compact/mobile rules can hide labels cleanly.
  - Add a visible icon to the New Automation button while preserving translated label text.
- Modify: `src/app/(main)/page.module.css`
  - Add mobile rail variables.
  - Keep sidebar visible as fixed icon rail at `<=760px`.
  - Reserve content space for rail.
  - Use `100dvh` and scroll-safe panel rules.
  - Improve hero, workspace, chats, preview, logs, and code responsive layout.
- Modify: `src/components/ProjectsPage.module.css`
  - Improve tablet/mobile card grid and action wrapping.
- Modify: `src/components/ScriptsPage.module.css`
  - Expand minified mobile rule into maintainable responsive blocks.
  - Improve cards/actions on tablet/mobile.
- Modify: `src/components/PricingPage.module.css`
  - Improve card/toggle/CTA responsiveness and modal fit.
- Modify: `src/components/ConfirmDialog.module.css`
  - Ensure dialog fits phone width and buttons stack cleanly.
- Modify: `src/components/SettingsModal.module.css`
  - Add mobile viewport-safe modal sizing and stack language buttons.

---

### Task 1: Add Responsive Verification Script

**Files:**
- Create: `scripts/verify-mobile-tablet-responsive.mjs`

- [ ] **Step 1: Write failing verification script**

Create `scripts/verify-mobile-tablet-responsive.mjs` with this content:

```js
import { readFileSync } from 'node:fs';

const files = {
  mainCss: 'src/app/(main)/page.module.css',
  mainJs: 'src/app/(main)/page.js',
  projectsCss: 'src/components/ProjectsPage.module.css',
  scriptsCss: 'src/components/ScriptsPage.module.css',
  pricingCss: 'src/components/PricingPage.module.css',
  confirmCss: 'src/components/ConfirmDialog.module.css',
  settingsCss: 'src/components/SettingsModal.module.css',
};

const read = (path) => readFileSync(path, 'utf8');
const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getMediaBlock(css, query) {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(open + 1, index);
  }
  return '';
}

function requireMatch(name, text, pattern) {
  if (!pattern.test(text)) fail(`Missing responsive guardrail: ${name}`);
}

const mainMobile = getMediaBlock(source.mainCss, '(max-width: 760px)');

requireMatch('main CSS defines mobile rail width', source.mainCss, /--mobile-rail-width:\s*64px/);
requireMatch('mobile media exists', source.mainCss, /@media\s*\(max-width:\s*760px\)/);
requireMatch('mobile sidebar stays visible', mainMobile, /\.sidebar\s*{[^}]*display:\s*flex[^}]*position:\s*fixed[^}]*width:\s*var\(--mobile-rail-width\)/s);
requireMatch('mobile sidebar not hidden', mainMobile, /\.sidebar\s*{(?![^}]*display:\s*none)/s);
requireMatch('mobile app surface assigned to rail column', mainMobile, /\.appSurface\s*{[^}]*grid-column:\s*2[^}]*overflow-y:\s*auto/s);
requireMatch('mobile uses dvh in shell', mainMobile, /100dvh/);
requireMatch('mobile nav labels hidden through spans', mainMobile, /\.navList\s+button\s+span[^}]*display:\s*none/s);
requireMatch('new automation button has icon', source.mainJs, /className=\{styles\.newChatButton\}[^>]*>[\s\S]*<Sparkles\s+size=\{16\}/);
requireMatch('home nav label wrapped', source.mainJs, /<Home\s+size=\{18\}\s*\/?>\s*<span>Home<\/span>/);
requireMatch('projects nav label wrapped', source.mainJs, /<Folder\s+size=\{18\}\s*\/?>\s*<span>Projects<\/span>/);
requireMatch('chats nav label wrapped', source.mainJs, /<MessageSquare\s+size=\{18\}\s*\/?>\s*<span>Chats<\/span>/);
requireMatch('scripts nav label wrapped', source.mainJs, /<FileCode2\s+size=\{18\}\s*\/?>\s*<span>Automation Scripts<\/span>/);
requireMatch('workspace mobile natural scroll', mainMobile, /\.workspaceLayout\s*{[^}]*height:\s*auto[^}]*overflow:\s*visible/s);
requireMatch('prompt rail mobile max-height removed', mainMobile, /\.promptRail\s*{[^}]*max-height:\s*none/s);
requireMatch('workspace panel mobile auto height', mainMobile, /\.workspacePanel\s*{[^}]*height:\s*auto[^}]*max-height:\s*none/s);
requireMatch('mobile composer stacks controls', mainMobile, /\.composerMeta\s*{[^}]*grid-template-columns:\s*1fr/s);

requireMatch('projects mobile one column', source.projectsCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.grid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('scripts tablet or mobile grid guardrail', source.scriptsCss, /@media\s*\(max-width:\s*1024px\)[\s\S]*\.summaryGrid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
requireMatch('scripts mobile one column', source.scriptsCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.summaryGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('pricing mobile one column', source.pricingCss, /@media\s*\(max-width:\s*760px\)[\s\S]*\.cardsGrid\s*{[^}]*grid-template-columns:\s*1fr/s);
requireMatch('confirm dialog mobile actions stack', source.confirmCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.actions\s*{[^}]*flex-direction:\s*column/s);
requireMatch('settings modal mobile query', source.settingsCss, /@media\s*\(max-width:\s*520px\)/);
requireMatch('settings language buttons stack', source.settingsCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.langOptions\s*{[^}]*flex-direction:\s*column/s);

console.log('Mobile/tablet responsive CSS verified.');
```

- [ ] **Step 2: Run script and verify it fails before implementation**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
```

Expected: FAIL with `Missing responsive guardrail` because the mobile rail and new responsive rules do not exist yet.

- [ ] **Step 3: Commit verifier**

Run:

```bash
git add scripts/verify-mobile-tablet-responsive.mjs
git commit -m "test: verify mobile tablet responsiveness"
```

Expected: commit contains only `scripts/verify-mobile-tablet-responsive.mjs`.

---

### Task 2: Main Shell Icon Rail

**Files:**
- Modify: `src/app/(main)/page.js:732-758`
- Modify: `src/app/(main)/page.module.css:49-115`
- Modify: `src/app/(main)/page.module.css:2123-2259`

- [ ] **Step 1: Update sidebar JSX for icon-safe labels**

In `src/app/(main)/page.js`, change the New Automation button and nav buttons to this shape:

```jsx
<button type="button" className={styles.newChatButton} onClick={startNewAutomation} title={t('sidebar.newAutomation')} aria-label={t('sidebar.newAutomation')}>
  <Sparkles size={16} />
  <span>{t('sidebar.newAutomation')}</span>
</button>
```

Change the nav button block to wrap visible labels in spans:

```jsx
<nav className={styles.navList}>
  <button type="button" className={activeView === 'home' ? styles.navActive : ''} onClick={() => { setActiveView('home'); window.history.pushState(null, '', '/'); }} title="Home"><Home size={18} /> <span>Home</span></button>
  <button type="button" className={activeView === 'projects' ? styles.navActive : ''} onClick={() => { setActiveView('projects'); window.history.pushState(null, '', '/projects'); }} title="Projects"><Folder size={18} /> <span>Projects</span></button>
  <button type="button" className={activeView === 'chats' ? styles.navActive : ''} onClick={() => { setActiveView('chats'); window.history.pushState(null, '', '/chats'); }} title="Chats"><MessageSquare size={18} /> <span>Chats</span></button>
  <button type="button" className={activeView === 'scripts' ? styles.navActive : ''} onClick={() => { setActiveView('scripts'); window.history.pushState(null, '', '/scripts'); }} title="Automation Scripts"><FileCode2 size={18} /> <span>Automation Scripts</span></button>
  <button type="button" className={styles.navDisabled} aria-disabled="true" data-tooltip="Coming in new Updates"><Code2 size={18} /> <span>Templates</span></button>
</nav>
```

- [ ] **Step 2: Add mobile rail variables and dvh shell baseline**

In `src/app/(main)/page.module.css`, update `.container` to include `--mobile-rail-width` and `100dvh` fallback:

```css
.container {
  --collapsed-rail-width: 64px;
  --mobile-rail-width: 64px;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}
```

Update `.sidebar` and `.appSurface` heights with `100dvh` fallback:

```css
.sidebar {
  height: 100vh;
  height: 100dvh;
  position: sticky;
  top: 0;
  border-right: 1px solid var(--border);
  background: var(--sidebar);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
}

.appSurface {
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  background: var(--bg);
  overflow: hidden;
}
```

- [ ] **Step 3: Replace mobile sidebar hide rule with fixed rail**

In the existing `@media (max-width: 760px)` block in `src/app/(main)/page.module.css`, replace `.container` and `.sidebar { display: none; }` mobile rules with:

```css
  .container {
    grid-template-columns: var(--mobile-rail-width) minmax(0, 1fr);
    min-height: 100dvh;
    height: 100dvh;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: var(--mobile-rail-width);
    height: 100dvh;
    padding: 0.55rem 0.4rem;
    align-items: center;
    overflow: hidden;
  }

  .appSurface {
    grid-column: 2;
    min-height: 100dvh;
    height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }
```

- [ ] **Step 4: Add mobile rail icon-only rules**

Still inside `@media (max-width: 760px)`, add:

```css
  .sidebarMain {
    width: 100%;
    align-items: center;
    gap: 0.65rem;
    overflow: visible;
    padding-right: 0;
  }

  .workspaceWrap,
  .newChatWrap,
  .navList,
  .sidebarAccountDock {
    width: 100%;
  }

  .workspaceSwitch,
  .newChatButton,
  .newChatDropdown,
  .navList button,
  .profileButton {
    width: 100%;
    min-height: 44px;
    justify-content: center;
    padding: 0;
  }

  .workspaceSwitch div,
  .workspaceSwitch svg,
  .newChatButton span,
  .newChatDropdown,
  .sidebarIconButton,
  .sidebarSearch,
  .sidebarSearchInput,
  .navList button span,
  .sidebarSection,
  .profileText,
  .planBadge,
  .workspaceMenu,
  .newAutomationMenu,
  .profileMenu {
    display: none;
  }

  .newChatWrap {
    display: block;
  }

  .newChatWrap .newChatButton {
    border-radius: 12px;
  }
```

- [ ] **Step 5: Run verifier to see remaining responsive gaps**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
```

Expected: FAIL on workspace/page/module guardrails that Task 3 and Task 4 will add.

- [ ] **Step 6: Commit shell changes**

Run:

```bash
git add "src/app/(main)/page.js" "src/app/(main)/page.module.css"
git commit -m "fix: keep mobile icon rail navigation"
```

Expected: commit contains only main shell JSX/CSS changes.

---

### Task 3: Workspace, Hero, And Chats Responsive Rules

**Files:**
- Modify: `src/app/(main)/page.module.css:1090-1230`
- Modify: `src/app/(main)/page.module.css:1384-1665`
- Modify: `src/app/(main)/page.module.css:2191-2259`
- Modify: `src/app/(main)/page.module.css:2700-2719`

- [ ] **Step 1: Make hero and composer fit mobile rail width**

Inside `@media (max-width: 760px)` in `src/app/(main)/page.module.css`, add or update:

```css
  .heroMode {
    min-height: 100dvh;
    padding: 1rem;
    place-items: start center;
    overflow-x: hidden;
  }

  .heroContent {
    align-items: stretch;
    text-align: left;
    padding-top: 1rem;
  }

  .heroLogo {
    margin-bottom: 1.25rem;
  }

  .heroContent h1 {
    font-size: clamp(2rem, 12vw, 3rem);
    line-height: 1;
  }

  .composerMeta {
    grid-template-columns: 1fr;
  }

  .heroPrompt {
    min-height: 132px;
  }
```

- [ ] **Step 2: Make workspace stack and scroll naturally on mobile**

In the same mobile block, replace current fixed mobile workspace height rules with:

```css
  .workspaceHeader {
    position: sticky;
    top: 0;
    z-index: 5;
    min-height: auto;
    flex-wrap: wrap;
    padding: 0.75rem;
  }

  .breadcrumbs,
  .headerActions {
    min-width: 0;
    flex-wrap: wrap;
  }

  .workspaceLayout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100dvh - 56px);
    overflow: visible;
  }

  .promptRail,
  .workspacePanel {
    height: auto;
    max-height: none;
    min-height: auto;
    overflow: visible;
    padding: 1rem;
  }

  .promptRail {
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .workspacePanel {
    overscroll-behavior: auto;
  }
```

- [ ] **Step 3: Make output panels fit phone width**

Inside the mobile block, add:

```css
  .previewTopbar,
  .locatorStrip,
  .codeToolbar,
  .qualityPanel {
    grid-template-columns: 1fr;
  }

  .codeToolbar,
  .codeActions,
  .generateRow,
  .formRow {
    flex-direction: column;
    align-items: stretch;
  }

  .previewContainer {
    min-height: 300px;
    padding: 1rem;
  }

  .console {
    max-height: 180px;
  }

  .code {
    min-height: 240px;
    font-size: 0.78rem;
  }
```

- [ ] **Step 4: Strengthen Chats mobile rows**

In the existing Chats mobile block near the end of `page.module.css`, add:

```css
  .chatsView {
    min-height: 100dvh;
    height: auto;
    overflow: visible;
  }

  .chatsHeader {
    padding: 1rem;
  }

  .chatItem {
    align-items: flex-start;
  }

  .chatItemMain {
    min-width: 0;
  }

  .chatItemTime {
    white-space: nowrap;
  }
```

- [ ] **Step 5: Run verifier to see remaining module gaps**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
```

Expected: FAIL only on Projects/Scripts/Pricing/Confirm/Settings module guardrails if Task 4 has not run yet.

- [ ] **Step 6: Commit workspace/chats changes**

Run:

```bash
git add "src/app/(main)/page.module.css"
git commit -m "fix: improve mobile workspace layout"
```

Expected: commit contains only main CSS responsive changes.

---

### Task 4: Page Modules And Modal Responsive Fit

**Files:**
- Modify: `src/components/ProjectsPage.module.css:453-469`
- Modify: `src/components/ScriptsPage.module.css:1-60`
- Modify: `src/components/PricingPage.module.css:554-593`
- Modify: `src/components/ConfirmDialog.module.css:120-EOF`
- Modify: `src/components/SettingsModal.module.css:1-150`

- [ ] **Step 1: Improve Projects responsive rules**

In `src/components/ProjectsPage.module.css`, add a tablet block before the existing mobile block:

```css
@media (max-width: 1024px) {
  .container {
    padding: 1.25rem;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Update the mobile block to include touch-friendly actions:

```css
@media (max-width: 760px) {
  .container {
    min-height: 100dvh;
    height: auto;
    padding: 1rem;
    overflow-x: hidden;
  }

  .header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .headerActions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .searchInput {
    width: 100%;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Expand Scripts responsive rules**

Replace the one-line mobile media rule in `src/components/ScriptsPage.module.css` with these blocks:

```css
@media (max-width: 1024px) {
  .container {
    min-height: 100dvh;
    height: auto;
    overflow-x: hidden;
  }

  .summaryGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
  }

  .headerActions,
  .upgradeActions,
  .cardActions,
  .metaRow,
  .runnerNotice {
    width: 100%;
    flex-wrap: wrap;
    align-items: stretch;
  }

  .summaryGrid,
  .grid {
    grid-template-columns: 1fr;
  }

  .primaryButton,
  .secondaryButton,
  .disabledRunButton {
    flex: 1 1 100%;
  }
}
```

- [ ] **Step 3: Improve Pricing mobile fit**

In `src/components/PricingPage.module.css`, keep existing breakpoints and add these rules inside `@media (max-width: 760px)`:

```css
  .pricingContainer {
    min-height: 100dvh;
    height: auto;
    overflow-x: hidden;
  }

  .billingToggle,
  .heroActions,
  .cardActions {
    width: 100%;
    flex-wrap: wrap;
  }

  .toggleButton,
  .ctaButton {
    flex: 1 1 100%;
    white-space: normal;
  }
```

Inside the existing `@media (max-width: 768px)` block in `src/app/(main)/page.module.css`, ensure pricing modal content scrolls internally:

```css
  .pricingModalContent {
    width: min(98%, 720px);
    max-height: 95dvh;
    overflow-y: auto;
    border-radius: 12px;
  }
```

- [ ] **Step 4: Improve ConfirmDialog mobile actions**

In `src/components/ConfirmDialog.module.css`, update or add inside `@media (max-width: 520px)`:

```css
  .dialog {
    width: min(94vw, 420px);
    max-height: 92dvh;
    overflow-y: auto;
  }

  .actions {
    flex-direction: column;
  }

  .cancelButton,
  .confirmButton {
    width: 100%;
  }
```

- [ ] **Step 5: Improve Settings modal mobile fit**

Append this block to `src/components/SettingsModal.module.css`:

```css
@media (max-width: 520px) {
  .overlay {
    align-items: flex-start;
    padding: 0.75rem;
    overflow-y: auto;
  }

  .modal {
    width: 100%;
    max-height: calc(100dvh - 1.5rem);
    padding: 1rem;
    border-radius: 14px;
  }

  .header {
    gap: 0.75rem;
  }

  .section {
    padding: 1rem;
  }

  .langOptions {
    flex-direction: column;
  }
}
```

- [ ] **Step 6: Run verifier and build**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
npm run build
```

Expected:

```text
Mobile/tablet responsive CSS verified.
```

`npm run build` exits 0.

- [ ] **Step 7: Commit page/module responsive changes**

Run:

```bash
git add "src/components/ProjectsPage.module.css" "src/components/ScriptsPage.module.css" "src/components/PricingPage.module.css" "src/components/ConfirmDialog.module.css" "src/components/SettingsModal.module.css" "src/app/(main)/page.module.css"
git commit -m "fix: polish responsive page layouts"
```

Expected: commit contains only CSS responsive changes.

---

### Task 5: Final Verification

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run responsive verifier**

Run:

```bash
node scripts/verify-mobile-tablet-responsive.mjs
```

Expected:

```text
Mobile/tablet responsive CSS verified.
```

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build exits 0 and generates all routes.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -10
```

Expected: working tree clean, latest commits are responsive implementation commits.

- [ ] **Step 4: Manual viewport check**

Run app locally if needed:

```bash
npm run dev
```

Inspect these viewport widths in browser devtools:

- `375px`: mobile icon rail visible, content not underneath rail, no horizontal overflow.
- `768px`: tablet compact rail usable, workspace/panels readable.
- `1024px`: compact/tablet layout keeps cards and panels readable.

Expected: no horizontal scrolling at page level, navigation remains reachable, modals fit viewport.

---

## Self-Review Notes

- Spec coverage: main shell, icon rail, workspace, Chats, Projects, Scripts, Pricing, confirmation dialog, settings modal, verifier, and build are covered.
- Non-goals respected: no bottom tabs, no slide drawer, no backend/data changes, no sidebar extraction.
- Placeholder scan: no incomplete markers.
- Type/property consistency: verification checks match CSS/JS selectors planned in tasks.
