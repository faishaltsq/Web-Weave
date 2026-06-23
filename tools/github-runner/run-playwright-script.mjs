import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
    const { run, script } = await fetchRunAndScript(supabase, runId);
    workdir = await mkdtemp(join(process.cwd(), '.webweave-run-'));
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
