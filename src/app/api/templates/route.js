import { NextResponse } from 'next/server';
import { createSupabaseServiceClient, hasSupabaseServerConfig } from '@/lib/supabase/server';

export async function GET() {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, templates: [] });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, prompt, framework, category')
    .eq('visibility', 'public')
    .order('name', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Templates query failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, configured: true, templates: data || [] });
}
