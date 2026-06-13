import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getGenerationQuotaStatus } from '@/lib/billing/quota';

export async function GET(req) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, usage: null });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const usage = await getGenerationQuotaStatus(auth);
    return NextResponse.json({ success: true, configured: true, usage });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
