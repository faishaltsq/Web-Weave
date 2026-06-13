import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getProjectLimit } from '@/lib/billing/plans';
import { getUserBillingProfile, resolveActivePlanId } from '@/lib/billing/quota';

const MAX_NAME_LENGTH = 80;
const MAX_DOMAIN_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 500;

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, projects: [] });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from('projects')
    .select('id, name, target_domain, description, created_at, updated_at')
    .eq('owner_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, configured: true, projects: data || [] });
}

export async function POST(req) {
  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const targetDomain = String(body.target_domain || '').trim();
  const description = String(body.description || '').trim();

  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ success: false, error: `Project name is required and must be ${MAX_NAME_LENGTH} characters or less.` }, { status: 400 });
  }

  if (targetDomain.length > MAX_DOMAIN_LENGTH) {
    return NextResponse.json({ success: false, error: `Target domain must be ${MAX_DOMAIN_LENGTH} characters or less.` }, { status: 400 });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ success: false, error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.` }, { status: 400 });
  }

  try {
    const profile = await getUserBillingProfile(auth.supabase, auth.user.id);
    const planId = resolveActivePlanId(profile);
    const projectLimit = getProjectLimit(planId);
    const { count, error: countError } = await auth.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id);

    if (countError) throw new Error(countError.message);
    if (Number(count || 0) >= projectLimit) {
      return NextResponse.json({
        success: false,
        error: 'Project limit reached. Please upgrade your plan to create more projects.',
        limit: projectLimit,
      }, { status: 402 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const { data, error } = await auth.supabase
    .from('projects')
    .insert({
      owner_id: auth.user.id,
      name,
      target_domain: targetDomain || null,
      description: description || null,
    })
    .select('id, name, target_domain, description, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, project: data });
}
