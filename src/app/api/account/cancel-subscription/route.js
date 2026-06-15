import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';

export async function POST(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: false, error: 'Supabase not configured.' }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('plan, billing_provider')
    .eq('id', auth.user.id)
    .single();

  if (!profile || profile.plan === 'free') {
    return NextResponse.json({ success: false, error: 'No active paid plan to cancel.' }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from('profiles')
    .update({
      plan: 'free',
      monthly_generation_limit: 5,
      billing_cycle: null,
      billing_provider: null,
      billing_period_ends_at: null,
      midtrans_order_id: null,
      midtrans_transaction_id: null,
      midtrans_status: null,
      billing_updated_at: new Date().toISOString(),
    })
    .eq('id', auth.user.id)
    .eq('plan', profile.plan);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, plan: 'free' });
}
