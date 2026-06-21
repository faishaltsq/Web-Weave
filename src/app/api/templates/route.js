import { NextResponse } from 'next/server';
import { createServerSupabaseClient, hasSupabaseServerConfig } from '@/lib/supabase/server';

export async function GET() {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ success: true, configured: false, templates: [] });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, prompt, framework, category')
    .eq('visibility', 'public')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, configured: true, templates: data || [] });
}
