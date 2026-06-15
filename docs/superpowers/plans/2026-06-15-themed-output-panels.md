# Themed Output Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Run Logs and Generated Code panels use light backgrounds in light mode while preserving dark-mode terminal contrast.

**Architecture:** Keep this as a CSS-only UI theme fix, with one small Node verification script to protect against hardcoded output-panel colors returning. Add output-specific CSS variables under existing `.darkMode` and `.lightMode`, then use them in the existing generation output selectors.

**Tech Stack:** Next.js App Router, CSS Modules, Node.js verification script, npm build.

---

## File Structure

- Modify: `src/app/(main)/page.module.css`
  - Add output-panel theme variables to `.darkMode` and `.lightMode`.
  - Replace hardcoded output-panel background/text colors in `.console`, `.consoleLine`, `.consolePrompt`, `.codeBlock`, `.code`, and `.codeEmptyState`.
  - Leave quality badge/status colors unchanged because they already use theme variables.
- Create: `scripts/verify-themed-output-panels.mjs`
  - Read `src/app/(main)/page.module.css`.
  - Assert output variables exist for both themes.
  - Assert `.console`, `.codeBlock`, and `.code` use those variables.
  - Assert old hardcoded output colors are not present in the relevant selectors.

---

### Task 1: Add Verification Script

**Files:**
- Create: `scripts/verify-themed-output-panels.mjs`

- [ ] **Step 1: Write failing verification script**

Create `scripts/verify-themed-output-panels.mjs` with this content:

```js
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/(main)/page.module.css', 'utf8');

const requiredSnippets = [
  '.darkMode {',
  '.lightMode {',
  '--output-bg:',
  '--output-text:',
  '--output-log-text:',
  '--output-prompt:',
  'background: var(--output-bg);',
  'color: var(--output-text);',
  'color: var(--output-log-text);',
  'color: var(--output-prompt);',
];

const missing = requiredSnippets.filter((snippet) => !css.includes(snippet));

if (missing.length > 0) {
  console.error(`Missing themed output panel CSS snippets:\n${missing.join('\n')}`);
  process.exit(1);
}

const selectorPatterns = [
  /\.console\s*{[^}]*background:\s*#050505/i,
  /\.consoleLine\s*{[^}]*color:\s*#93c5fd/i,
  /\.codeBlock\s*{[^}]*background:\s*#050505/i,
  /\.code\s*{[^}]*color:\s*#dbeafe/i,
];

const hardcodedMatches = selectorPatterns.filter((pattern) => pattern.test(css));

if (hardcodedMatches.length > 0) {
  console.error('Output panels still contain hardcoded dark-only colors.');
  process.exit(1);
}

console.log('Themed output panel CSS verified.');
```

- [ ] **Step 2: Run script to verify it fails before CSS change**

Run:

```bash
node scripts/verify-themed-output-panels.mjs
```

Expected: FAIL with `Missing themed output panel CSS snippets` because output variables do not exist yet.

- [ ] **Step 3: Commit verification script**

Run:

```bash
git add scripts/verify-themed-output-panels.mjs
git commit -m "test: verify themed output panels"
```

Expected: commit succeeds with only the verification script staged.

---

### Task 2: Theme Output Panel CSS

**Files:**
- Modify: `src/app/(main)/page.module.css:1-39`
- Modify: `src/app/(main)/page.module.css:1526-1549`
- Modify: `src/app/(main)/page.module.css:1643-1652`
- Modify: `src/app/(main)/page.module.css:2033-2052`

- [ ] **Step 1: Add output theme variables**

In `src/app/(main)/page.module.css`, add these variables inside `.darkMode` after `--input`:

```css
  --output-bg: #050505;
  --output-text: #dbeafe;
  --output-log-text: #93c5fd;
  --output-prompt: #22c55e;
```

Add these variables inside `.lightMode` after `--input`:

```css
  --output-bg: #f8fafc;
  --output-text: #0f172a;
  --output-log-text: #1e3a8a;
  --output-prompt: #15803d;
```

- [ ] **Step 2: Replace console hardcoded colors**

Change `.console`, `.consoleLine`, and `.consolePrompt` to:

```css
.console {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--output-bg);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: Consolas, 'Fira Code', monospace;
  font-size: 0.78rem;
}

.consoleLine {
  display: flex;
  gap: 0.5rem;
  color: var(--output-log-text);
  word-break: break-word;
}

.consolePrompt {
  color: var(--output-prompt);
}
```

- [ ] **Step 3: Make empty code state explicitly themed**

Replace the shared empty/loading/code empty block with:

```css
.emptyState,
.loadingState,
.codeEmptyState {
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--muted);
  padding: 2rem;
}

.codeEmptyState {
  background: var(--output-bg);
  color: var(--muted);
}
```

- [ ] **Step 4: Replace generated code hardcoded colors**

Change `.codeBlock` and `.code` to:

```css
.codeBlock {
  background: var(--output-bg);
  max-height: none;
  overflow: visible;
  display: block;
}

.code {
  display: block;
  margin: 0;
  min-height: 300px;
  padding: 1rem;
  color: var(--output-text);
  font-family: Consolas, 'Fira Code', monospace;
  font-size: 0.84rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
}
```

- [ ] **Step 5: Run verification script**

Run:

```bash
node scripts/verify-themed-output-panels.mjs
```

Expected: PASS with `Themed output panel CSS verified.`

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: build exits 0 without CSS or Next.js errors.

- [ ] **Step 7: Commit CSS implementation**

Run:

```bash
git add "src/app/(main)/page.module.css"
git commit -m "fix: theme output panels"
```

Expected: commit succeeds with only CSS implementation staged.

---

## Self-Review Notes

- Spec coverage: Logs panel, generated code panel, empty code state, and quality/status non-change are all covered.
- Placeholder scan: no TODO/TBD placeholders.
- Type/property consistency: CSS variable names are consistent across verification script and CSS tasks.
