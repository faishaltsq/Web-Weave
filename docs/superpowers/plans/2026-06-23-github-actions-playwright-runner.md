# GitHub Actions Playwright Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a staging-ready, low-cost cloud automation runner by triggering GitHub Actions from WebWeave and storing run status/logs in Supabase.

**Architecture:** Keep the Next.js app on Vercel. Add a `POST /api/runs` route that creates a Supabase `runs` row and dispatches a GitHub Actions workflow. The workflow runs generated Playwright JavaScript in GitHub-hosted Linux, then updates the `runs` row with `passed`, `failed`, or `error` plus logs.

**Tech Stack:** Next.js 14 route handlers, Supabase service client, GitHub Actions `workflow_dispatch`, Node.js 20, Playwright JavaScript, existing `runs` and `usage_events` tables.

---

## Scope And Cost Strategy

First version supports only `playwright_js` generated scripts. This keeps install/runtime cost small and avoids Python/Selenium/Cypress setup.

Use GitHub Actions because it can run immediately from staging without Cloud Run billing. It is queue-based, so UI should show `queued` and `running` states instead of pretending execution is instant.

Limits for first release:

- One active run per user: statuses `queued` or `running`.
- Workflow timeout: 5 minutes.
- Child process timeout: 120 seconds.
- Log saved to Supabase: 30,000 characters.
- No secrets passed to generated script child process.

## Required Environment Variables

Set these in Vercel staging:

```env
GITHUB_ACTIONS_TOKEN=
GITHUB_REPO_OWNER=your-github-user-or-org
GITHUB_REPO_NAME=WebWeave
GITHUB_RUN_WORKFLOW_FILE=run-playwright-script.yml
GITHUB_RUN_REF=master
```

`GITHUB_ACTIONS_TOKEN` should be a fine-grained GitHub token with:

- Repository access: this repository only.
- Actions: read/write.
- Contents: read.

Set these in GitHub repository Actions secrets:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or generated script process.

## File Structure

- Create: `src/app/api/runs/route.js`
  - Authenticates user, validates script ownership, blocks unsupported frameworks, creates `runs` rows, dispatches GitHub workflow, returns run status.
- Create: `tools/github-runner/run-playwright-script.mjs`
  - Runs inside GitHub Actions, fetches run/script from Supabase, executes generated JS with sanitized environment, updates run result.
- Create: `.github/workflows/run-playwright-script.yml`
  - Manual `workflow_dispatch` runner triggered by Vercel API.
- Modify: `src/app/(main)/page.js`
  - Add run button for saved Playwright JS scripts, poll run status, show logs in existing Run logs panel.
- Modify: `src/app/(main)/page.module.css`
  - Add small button/badge styles for run status.
- Create: `scripts/verify-github-actions-runner.mjs`
  - Static verification that route, workflow, and runner guardrails exist.
- Modify: `package.json`
  - Add `verify:github-runner` script.

---

### Task 1: Add Static Verification First

**Files:**
- Create: `scripts/verify-github-actions-runner.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create failing verification script**

Create `scripts/verify-github-actions-runner.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [
  ['API route', 'src/app/api/runs/route.js'],
  ['GitHub runner', 'tools/github-runner/run-playwright-script.mjs'],
  ['GitHub workflow', '.github/workflows/run-playwright-script.yml'],
];

const missingFiles = files.filter(([, file]) => !existsSync(join(process.cwd(), file)));

if (missingFiles.length) {
  console.error('GitHub Actions runner verification failed: missing files');
  for (const [label, file] of missingFiles) console.error(`- ${label}: ${file}`);
  process.exit(1);
}

const route = readFileSync(join(process.cwd(), 'src/app/api/runs/route.js'), 'utf8');
const runner = readFileSync(join(process.cwd(), 'tools/github-runner/run-playwright-script.mjs'), 'utf8');
const workflow = readFileSync(join(process.cwd(), '.github/workflows/run-playwright-script.yml'), 'utf8');

const requiredTokens = [
  ['route validates Playwright JS only', route, "script.framework !== 'playwright_js'"],
  ['route enforces one active run', route, ".in('status', ['queued', 'running'])"],
  ['route dispatches workflow', route, '/actions/workflows/'],
  ['runner sanitizes child env', runner, 'createChildEnv()'],
  ['runner blocks inherited Supabase key', runner, 'SUPABASE_SERVICE_ROLE_KEY: undefined'],
  ['runner has child timeout', runner, 'RUN_TIMEOUT_MS = 120_000'],
  ['workflow uses dispatch input', workflow, 'workflow_dispatch'],
  ['workflow installs chromium', workflow, 'npx playwright install --with-deps chromium'],
];

const missingTokens = requiredTokens.filter(([, content, token]) => !content.includes(token));

if (missingTokens.length) {
  console.error('GitHub Actions runner verification failed: missing guardrails');
  for (const [label,, token] of missingTokens) console.error(`- ${label}: ${token}`);
  process.exit(1);
}

console.log('GitHub Actions runner verification passed.');
```

- [ ] **Step 2: Add npm script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "verify:github-runner": "node scripts/verify-github-actions-runner.mjs"
  }
}
```

- [ ] **Step 3: Run verification and confirm it fails**

Run:

```bash
npm run verify:github-runner
```

Expected:

```text
GitHub Actions runner verification failed: missing files
```

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/verify-github-actions-runner.mjs
git commit -m "test: add github actions runner verification"
```

---

### Task 2: Add Runs API Route

**Files:**
- Create: `src/app/api/runs/route.js`

- [ ] **Step 1: Create API route**

Create `src/app/api/runs/route.js`:

```js
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

const ACTIVE_RUN_STATUSES = ['queued', 'running'];
const MAX_LOG_LENGTH = 30000;

function getGithubConfig() {
  return {
    token: process.env.GITHUB_ACTIONS_TOKEN || '',
    owner: process.env.GITHUB_REPO_OWNER || '',
    repo: process.env.GITHUB_REPO_NAME || '',
    workflowFile: process.env.GITHUB_RUN_WORKFLOW_FILE || 'run-playwright-script.yml',
    ref: process.env.GITHUB_RUN_REF || 'master',
  };
}

function hasGithubConfig(config) {
  return Boolean(config.token && config.owner && config.repo && config.workflowFile && config.ref);
}

async function dispatchWorkflow(runId) {
  const config = getGithubConfig();
  if (!hasGithubConfig(config)) {
    throw new Error('GitHub Actions runner is not configured.');
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/workflows/${encodeURIComponent(config.workflowFile)}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: config.ref, inputs: { run_id: runId } }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub workflow dispatch failed with ${response.status}: ${detail.slice(0, 500)}`);
  }
}

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, runs: [] });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('id');
  const scriptId = searchParams.get('script_id');

  let query = auth.supabase
    .from('runs')
    .select('id, script_id, project_id, status, logs, error_message, screenshot_url, duration_ms, created_at, updated_at')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (runId) query = query.eq('id', runId).limit(1);
  if (scriptId) query = query.eq('script_id', scriptId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, configured: true, runs: data || [] });
}

export async function POST(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const scriptId = String(body.script_id || '').trim();
  if (!scriptId) return NextResponse.json({ success: false, error: 'Script ID is required.' }, { status: 400 });

  const { data: script, error: scriptError } = await auth.supabase
    .from('generated_scripts')
    .select('id, project_id, owner_id, framework')
    .eq('id', scriptId)
    .eq('owner_id', auth.user.id)
    .single();

  if (scriptError || !script) {
    return NextResponse.json({ success: false, error: 'Script not found.' }, { status: 404 });
  }

  if (script.framework !== 'playwright_js') {
    return NextResponse.json({ success: false, error: 'Cloud run validation currently supports Playwright JavaScript only.' }, { status: 400 });
  }

  const { data: activeRuns, error: activeError } = await auth.supabase
    .from('runs')
    .select('id, status')
    .eq('owner_id', auth.user.id)
    .in('status', ['queued', 'running'])
    .limit(1);

  if (activeError) return NextResponse.json({ success: false, error: activeError.message }, { status: 500 });
  if (activeRuns?.length) {
    return NextResponse.json({ success: false, error: 'One automation run is already queued or running.' }, { status: 409 });
  }

  const { data: run, error: insertError } = await auth.supabase
    .from('runs')
    .insert({
      script_id: script.id,
      project_id: script.project_id,
      owner_id: auth.user.id,
      status: 'queued',
      logs: 'Queued GitHub Actions Playwright run.',
    })
    .select('id, script_id, project_id, status, logs, error_message, screenshot_url, duration_ms, created_at, updated_at')
    .single();

  if (insertError) return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });

  try {
    await dispatchWorkflow(run.id);
  } catch (error) {
    const message = error.message.slice(0, MAX_LOG_LENGTH);
    await auth.supabase
      .from('runs')
      .update({ status: 'error', error_message: message, logs: message })
      .eq('id', run.id)
      .eq('owner_id', auth.user.id);

    return NextResponse.json({ success: false, error: message, run: { ...run, status: 'error', error_message: message, logs: message } }, { status: 502 });
  }

  await auth.supabase.from('usage_events').insert({
    owner_id: auth.user.id,
    event_type: 'run_requested',
    quantity: 1,
    metadata: { run_id: run.id, script_id: script.id, project_id: script.project_id, runner: 'github_actions' },
  });

  return NextResponse.json({ success: true, run });
}
```

- [ ] **Step 2: Run verification**

Run:

```bash
npm run verify:github-runner
```

Expected: still fails because runner and workflow files do not exist.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/runs/route.js
git commit -m "feat: add github actions run dispatch api"
```

---

### Task 3: Add GitHub Actions Runner Script

**Files:**
- Create: `tools/github-runner/run-playwright-script.mjs`

- [ ] **Step 1: Create runner script**

Create `tools/github-runner/run-playwright-script.mjs`:

```js
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const RUN_TIMEOUT_MS = 120_000;
const MAX_LOG_LENGTH = 30_000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function trimLog(value) {
  const text = String(value || '');
  if (text.length <= MAX_LOG_LENGTH) return text;
  return `${text.slice(0, MAX_LOG_LENGTH)}\n\n[Runner log truncated at ${MAX_LOG_LENGTH} characters]`;
}

function createChildEnv() {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    CI: 'true',
    NODE_ENV: 'production',
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    GITHUB_TOKEN: undefined,
  };
}

async function updateRun(supabase, runId, patch) {
  const { error } = await supabase
    .from('runs')
    .update(patch)
    .eq('id', runId);

  if (error) throw new Error(`Failed to update run ${runId}: ${error.message}`);
}

async function fetchRunAndScript(supabase, runId) {
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id, script_id, project_id, owner_id, status')
    .eq('id', runId)
    .single();

  if (runError || !run) throw new Error(`Run not found: ${runError?.message || runId}`);

  const { data: script, error: scriptError } = await supabase
    .from('generated_scripts')
    .select('id, owner_id, framework, target_url, code')
    .eq('id', run.script_id)
    .eq('owner_id', run.owner_id)
    .single();

  if (scriptError || !script) throw new Error(`Script not found: ${scriptError?.message || run.script_id}`);
  if (script.framework !== 'playwright_js') throw new Error('Runner supports Playwright JavaScript only.');
  if (!script.code || script.code.length > 250000) throw new Error('Script code is missing or too large.');

  return { run, script };
}

function runNodeScript(filePath, cwd) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let output = '';
    let timedOut = false;

    const child = spawn(process.execPath, [filePath], {
      cwd,
      env: createChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, RUN_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      output = trimLog(output + chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      output = trimLog(output + chunk.toString());
    });

    child.on('error', (error) => {
      output = trimLog(`${output}\n${error.stack || error.message}`);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      if (timedOut) {
        resolve({ status: 'failed', durationMs, logs: trimLog(`${output}\nRun timed out after ${RUN_TIMEOUT_MS}ms.`), errorMessage: 'Run timed out.' });
        return;
      }

      if (code === 0) {
        resolve({ status: 'passed', durationMs, logs: trimLog(output || 'Run completed successfully.'), errorMessage: null });
        return;
      }

      resolve({ status: 'failed', durationMs, logs: trimLog(output || `Process exited with code ${code} and signal ${signal || 'none'}.`), errorMessage: `Process exited with code ${code}.` });
    });
  });
}

async function main() {
  const runId = process.env.WEBWEAVE_RUN_ID || process.argv[2];
  if (!runId) throw new Error('WEBWEAVE_RUN_ID is required.');

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  await updateRun(supabase, runId, { status: 'running', logs: 'GitHub Actions runner started.' });

  let workdir = null;
  try {
    const { script } = await fetchRunAndScript(supabase, runId);
    workdir = await mkdtemp(join(tmpdir(), 'webweave-run-'));
    const scriptPath = join(workdir, 'generated-script.cjs');
    await writeFile(scriptPath, script.code, 'utf8');

    const result = await runNodeScript(scriptPath, workdir);
    await updateRun(supabase, runId, {
      status: result.status,
      logs: result.logs,
      error_message: result.errorMessage,
      duration_ms: result.durationMs,
    });

    await supabase.from('usage_events').insert({
      owner_id: (await fetchRunAndScript(supabase, runId)).run.owner_id,
      event_type: 'run_completed',
      quantity: 1,
      metadata: { run_id: runId, status: result.status, runner: 'github_actions', duration_ms: result.durationMs },
    });

    if (result.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    const message = trimLog(error.stack || error.message);
    await updateRun(supabase, runId, { status: 'error', logs: message, error_message: error.message.slice(0, 500) });
    process.exitCode = 1;
  } finally {
    if (workdir) await rm(workdir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Reduce duplicate fetch before implementation review**

In the script above, replace the completion insert block with this version so the run is fetched once:

```js
    const { run, script } = await fetchRunAndScript(supabase, runId);
    workdir = await mkdtemp(join(tmpdir(), 'webweave-run-'));
    const scriptPath = join(workdir, 'generated-script.cjs');
    await writeFile(scriptPath, script.code, 'utf8');

    const result = await runNodeScript(scriptPath, workdir);
    await updateRun(supabase, runId, {
      status: result.status,
      logs: result.logs,
      error_message: result.errorMessage,
      duration_ms: result.durationMs,
    });

    await supabase.from('usage_events').insert({
      owner_id: run.owner_id,
      event_type: 'run_completed',
      quantity: 1,
      metadata: { run_id: runId, status: result.status, runner: 'github_actions', duration_ms: result.durationMs },
    });
```

- [ ] **Step 3: Run verification**

Run:

```bash
npm run verify:github-runner
```

Expected: still fails because workflow file does not exist.

- [ ] **Step 4: Commit**

```bash
git add tools/github-runner/run-playwright-script.mjs
git commit -m "feat: add github actions playwright runner script"
```

---

### Task 4: Add GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/run-playwright-script.yml`

- [ ] **Step 1: Create workflow file**

Create `.github/workflows/run-playwright-script.yml`:

```yaml
name: Run WebWeave Playwright Script

on:
  workflow_dispatch:
    inputs:
      run_id:
        description: Supabase runs.id to execute
        required: true
        type: string

permissions:
  contents: read

jobs:
  run-playwright-script:
    name: Run Playwright JavaScript
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Run generated Playwright script
        run: node tools/github-runner/run-playwright-script.mjs
        env:
          WEBWEAVE_RUN_ID: ${{ inputs.run_id }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

- [ ] **Step 2: Run verification**

Run:

```bash
npm run verify:github-runner
```

Expected:

```text
GitHub Actions runner verification passed.
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/run-playwright-script.yml
git commit -m "ci: add playwright script runner workflow"
```

---

### Task 5: Add UI Trigger And Polling

**Files:**
- Modify: `src/app/(main)/page.js`
- Modify: `src/app/(main)/page.module.css`

- [ ] **Step 1: Add run state near existing state declarations**

In `src/app/(main)/page.js`, add near `deletingScript` state:

```js
  const [scriptRunStates, setScriptRunStates] = useState({});
  const [scriptRunLoadingId, setScriptRunLoadingId] = useState('');
```

- [ ] **Step 2: Add polling helpers after `handleDeleteScript`**

Add this function block after `handleDeleteScript`:

```js
  const pollScriptRun = async (runId, scriptId, attempt = 0) => {
    if (attempt > 40) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/runs?id=${encodeURIComponent(runId)}`, { headers });
      const data = await response.json();
      const run = data.runs?.[0];

      if (response.ok && data.success && run) {
        setScriptRunStates((prev) => ({ ...prev, [scriptId]: run }));

        if (activeScriptId === scriptId) {
          setLogs((run.logs || '').split('\n').filter(Boolean));
        }

        if (run.status === 'queued' || run.status === 'running') {
          window.setTimeout(() => pollScriptRun(runId, scriptId, attempt + 1), 3000);
        }
      }
    } catch (err) {
      setScriptRunStates((prev) => ({
        ...prev,
        [scriptId]: { id: runId, script_id: scriptId, status: 'error', error_message: err.message, logs: err.message },
      }));
    }
  };

  const handleRunScript = async (script) => {
    if (!script?.id) return;

    if (script.framework !== 'playwright_js') {
      setError('Cloud run validation currently supports Playwright JavaScript only.');
      return;
    }

    setScriptRunLoadingId(script.id);
    setError('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: script.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to start cloud run.');

      setScriptRunStates((prev) => ({ ...prev, [script.id]: data.run }));
      setLogs((data.run.logs || 'Queued GitHub Actions Playwright run.').split('\n').filter(Boolean));
      pollScriptRun(data.run.id, script.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setScriptRunLoadingId('');
    }
  };
```

- [ ] **Step 3: Add run button to generated code toolbar**

In the generated code toolbar near Copy and Download buttons, add this button before Copy:

```jsx
                        {activeScriptId && framework === 'playwright_js' && (
                          <button
                            type="button"
                            onClick={() => handleRunScript(scripts.find((script) => script.id === activeScriptId))}
                            className={styles.actionButton}
                            disabled={scriptRunLoadingId === activeScriptId || ['queued', 'running'].includes(scriptRunStates[activeScriptId]?.status)}
                            title="Run in GitHub Actions"
                          >
                            {scriptRunLoadingId === activeScriptId || ['queued', 'running'].includes(scriptRunStates[activeScriptId]?.status) ? <Loader size={16} className={styles.spinner} /> : <Zap size={16} />}
                            {scriptRunStates[activeScriptId]?.status ? `Run: ${scriptRunStates[activeScriptId].status}` : 'Run'}
                          </button>
                        )}
```

- [ ] **Step 4: Add run button to chat list rows**

Inside `visibleScripts.map`, after delete button, add:

```jsx
                    {script.framework === 'playwright_js' && (
                      <button
                        type="button"
                        className={styles.chatItemRun}
                        onClick={(e) => { e.stopPropagation(); handleRunScript(script); }}
                        disabled={scriptRunLoadingId === script.id || ['queued', 'running'].includes(scriptRunStates[script.id]?.status)}
                        title="Run in GitHub Actions"
                      >
                        {scriptRunLoadingId === script.id || ['queued', 'running'].includes(scriptRunStates[script.id]?.status) ? <Loader size={14} className={styles.spinner} /> : <Zap size={14} />}
                      </button>
                    )}
```

- [ ] **Step 5: Add CSS for chat run button**

Add to `src/app/(main)/page.module.css` near `.chatItemDelete` styles:

```css
.chatItemRun {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 160ms ease, color 160ms ease, border-color 160ms ease;
}

.chatItemRun:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.chatItemRun:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/page.js src/app/(main)/page.module.css
git commit -m "feat: add github actions run controls"
```

---

### Task 6: Configure Staging Secrets

**Files:**
- No repo file changes required.

- [ ] **Step 1: Add GitHub repository Actions secrets**

In GitHub repository settings, add:

```text
NEXT_PUBLIC_SUPABASE_URL=<staging Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<staging Supabase service role key>
```

- [ ] **Step 2: Add Vercel staging environment variables**

In Vercel project settings, add:

```text
GITHUB_ACTIONS_TOKEN=<fine-grained GitHub token>
GITHUB_REPO_OWNER=<GitHub owner or org>
GITHUB_REPO_NAME=WebWeave
GITHUB_RUN_WORKFLOW_FILE=run-playwright-script.yml
GITHUB_RUN_REF=master
```

- [ ] **Step 3: Redeploy staging**

Trigger Vercel redeploy from `master` after variables are saved.

- [ ] **Step 4: Confirm workflow appears**

Open GitHub Actions tab and confirm workflow name is:

```text
Run WebWeave Playwright Script
```

---

### Task 7: End-To-End Staging Verification

**Files:**
- No repo file changes required unless verification finds a bug.

- [ ] **Step 1: Run static verification**

Run:

```bash
npm run verify:github-runner
```

Expected:

```text
GitHub Actions runner verification passed.
```

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 3: Generate Playwright JavaScript script in staging**

Use staging site:

```text
https://web-weave-lake.vercel.app
```

Generate a script with:

```text
Target URL: https://www.saucedemo.com
Objective: Open the login page and verify username and password fields are visible. Do not submit credentials.
Framework: Playwright JavaScript
```

Expected UI result:

```text
Generated code appears and script is saved to history.
```

- [ ] **Step 4: Start run from UI**

Click `Run` on the saved script.

Expected UI states:

```text
Run: queued
Run: running
Run: passed or Run: failed
```

- [ ] **Step 5: Confirm Supabase run row**

In Supabase SQL editor, run:

```sql
select id, script_id, status, duration_ms, left(logs, 500) as log_preview, created_at, updated_at
from public.runs
order by created_at desc
limit 5;
```

Expected:

```text
Latest row has status passed, failed, or error and logs are not empty.
```

- [ ] **Step 6: Confirm GitHub workflow execution**

Open GitHub Actions run.

Expected:

```text
Run generated Playwright script step executed. If generated script failed, workflow may be red while Supabase run status is failed.
```

---

## Rollback Plan

If staging run breaks user flow:

1. Remove Vercel `GITHUB_ACTIONS_TOKEN` value. `POST /api/runs` will return configured error and generation remains usable.
2. Hide the UI run button by reverting Task 5 commit.
3. Keep workflow file in repo; it is inert without API dispatch.

## Known Limitations

- GitHub Actions has queue/cold start delay, so this is not real-time execution.
- First release stores logs only. Screenshots can be added after generated scripts follow a standardized output path.
- Raw generated JavaScript still has risk. The child process receives sanitized environment, but it can still access public network and repository files available in the checkout.
- This should be enabled for staging/private beta first, not anonymous public usage.

## Self-Review

- Spec coverage: plan covers API dispatch, GitHub workflow, runner execution, Supabase status updates, UI trigger, staging secrets, verification, rollback.
- Placeholder scan: no placeholder markers or open-ended implementation steps remain.
- Type consistency: route uses `script_id`, runner uses `WEBWEAVE_RUN_ID`, workflow dispatch input uses `run_id`, and UI sends `{ script_id: script.id }`.
