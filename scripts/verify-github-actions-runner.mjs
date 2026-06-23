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
