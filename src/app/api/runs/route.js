import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

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
