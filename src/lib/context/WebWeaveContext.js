'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createBrowserSupabaseClient, hasSupabaseBrowserConfig } from '@/lib/supabase/browser';

const WebWeaveContext = createContext(null);

export function WebWeaveProvider({ children }) {
  const supabase = hasSupabaseBrowserConfig() ? createBrowserSupabaseClient() : null;
  const SUPABASE_ENABLED = Boolean(supabase);

  const [user, setUser] = useState(null);
  const [authSessionLoading, setAuthSessionLoading] = useState(!!supabase);
  const [projects, setProjects] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [usageStatus, setUsageStatus] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeScriptId, setActiveScriptId] = useState('');
  const [pendingScript, setPendingScript] = useState(null);

  useEffect(() => {
    if (!supabase) { setAuthSessionLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setUser(data.session?.user || null); })
      .catch(() => {})
      .finally(() => { if (mounted) setAuthSessionLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!user) { setProjects([]); setScripts([]); setSelectedProjectId(''); setUsageStatus(null); return; }
    loadPrivateData();
  }, [user]);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, [supabase]);

  const loadPrivateData = useCallback(async () => {
    if (!user || !supabase) return;
    setHistoryLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [pr, sr, ur] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/generated-scripts', { headers }),
        fetch('/api/account/usage', { headers }),
      ]);
      const pd = await pr.json(); const sd = await sr.json(); const ud = await ur.json();
      if (ud.success) setUsageStatus(ud.usage || null);
      if (pd.success) { setProjects(pd.projects || []); if (!selectedProjectId && pd.projects?.length) setSelectedProjectId(pd.projects[0].id); }
      if (sd.success) setScripts(sd.scripts || []);
    } catch {} finally { setHistoryLoading(false); }
  }, [user, supabase, getAuthHeaders, selectedProjectId]);

  const value = {
    supabase, SUPABASE_ENABLED, user, setUser, authSessionLoading,
    projects, setProjects, scripts, setScripts, historyLoading,
    usageStatus, setUsageStatus, selectedProjectId, setSelectedProjectId,
    activeScriptId, setActiveScriptId,
    pendingScript, setPendingScript,
    loadPrivateData, getAuthHeaders,
  };

  return <WebWeaveContext.Provider value={value}>{children}</WebWeaveContext.Provider>;
}

export function useWebWeave() {
  const ctx = useContext(WebWeaveContext);
  if (!ctx) throw new Error('useWebWeave must be used within WebWeaveProvider');
  return ctx;
}
