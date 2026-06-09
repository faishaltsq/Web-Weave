import { createClient } from '@supabase/supabase-js';

export function hasSupabaseServerConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseServiceClient() {
  if (!hasSupabaseServerConfig()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getAuthenticatedUser(req) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { error: 'Supabase is not configured.', status: 503 };
  }

  const authorization = req.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { error: 'Authentication required.', status: 401 };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { error: 'Invalid or expired session.', status: 401 };
  }

  return { supabase, user: data.user };
}
