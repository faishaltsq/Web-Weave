import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

const MAX_PROMPT_LENGTH = 4000;
const MAX_URL_LENGTH = 2048;
const MAX_CODE_LENGTH = 250000;

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, scripts: [] });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');

  let query = auth.supabase
    .from('generated_scripts')
    .select('id, project_id, framework, prompt, target_url, code, quality_gate, quality_checks, locator_summary, created_at')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, configured: true, scripts: data || [] });
}

export async function POST(req) {
  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const framework = String(body.framework || '').trim();
  const prompt = String(body.prompt || '').trim();
  const targetUrl = String(body.target_url || '').trim();
  const code = String(body.code || '').trim();

  if (!projectId) return NextResponse.json({ success: false, error: 'Project is required.' }, { status: 400 });
  if (!framework) return NextResponse.json({ success: false, error: 'Framework is required.' }, { status: 400 });
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return NextResponse.json({ success: false, error: `Prompt is required and must be ${MAX_PROMPT_LENGTH} characters or less.` }, { status: 400 });
  if (!targetUrl || targetUrl.length > MAX_URL_LENGTH) return NextResponse.json({ success: false, error: `Target URL is required and must be ${MAX_URL_LENGTH} characters or less.` }, { status: 400 });
  if (!code || code.length > MAX_CODE_LENGTH) return NextResponse.json({ success: false, error: `Code is required and must be ${MAX_CODE_LENGTH} characters or less.` }, { status: 400 });

  const { data: project, error: projectError } = await auth.supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from('generated_scripts')
    .insert({
      project_id: projectId,
      owner_id: auth.user.id,
      framework,
      prompt,
      target_url: targetUrl,
      code,
      quality_gate: body.quality_gate || null,
      quality_checks: Array.isArray(body.quality_checks) ? body.quality_checks.slice(0, 100).map((c) => ({
        label: String(c?.label || '').slice(0, 200),
        status: ['pass', 'fail', 'warn'].includes(c?.status) ? c.status : 'pass',
        detail: String(c?.detail || '').slice(0, 200),
      })) : [],
      locator_summary: Array.isArray(body.locator_summary) ? body.locator_summary : [],
      provider: body.provider || null,
    })
    .select('id, project_id, framework, prompt, target_url, code, quality_gate, quality_checks, locator_summary, created_at')
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  await auth.supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id);

  await auth.supabase.from('usage_events').insert({
    owner_id: auth.user.id,
    event_type: 'generation_saved',
    quantity: 1,
    metadata: { framework, project_id: projectId, script_id: data.id },
  });

  return NextResponse.json({ success: true, script: data });
}
