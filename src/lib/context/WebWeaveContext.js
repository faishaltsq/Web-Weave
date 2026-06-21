'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient, hasSupabaseBrowserConfig } from '@/lib/supabase/browser';

const WebWeaveContext = createContext(null);

export function WebWeaveProvider({ children }) {
  const [supabase] = useState(() => hasSupabaseBrowserConfig() ? createBrowserSupabaseClient() : null);
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
  const [templates, setTemplates] = useState([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!supabase) { setAuthSessionLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setUser(data.session?.user || null); })
      .catch(() => {})
      .finally(() => { if (mounted) setAuthSessionLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUser(s?.user || null);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [supabase]);

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
      if (pd.success) {
        const nextProjects = pd.projects || [];
        setProjects(nextProjects);
        setSelectedProjectId((prev) => (!prev && nextProjects.length) ? nextProjects[0].id : prev);
      }
      if (sd.success) setScripts(sd.scripts || []);
    } catch {} finally { setHistoryLoading(false); }
  }, [user, supabase, getAuthHeaders]);

  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/templates', { headers });
      const data = await res.json();
      if (data.success) setTemplates(data.templates || []);
    } catch {}
  }, [supabase, getAuthHeaders]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setScripts([]);
      setTemplates([]);
      setSelectedProjectId('');
      setUsageStatus(null);
      return;
    }
    loadPrivateData();
    fetchTemplates();
  }, [user, loadPrivateData, fetchTemplates]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === 'visible') loadPrivateData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, loadPrivateData]);

  const value = useMemo(() => ({
    supabase, SUPABASE_ENABLED, user, setUser, authSessionLoading,
    projects, setProjects, scripts, setScripts, historyLoading,
    usageStatus, setUsageStatus, selectedProjectId, setSelectedProjectId,
    activeScriptId, setActiveScriptId,
    pendingScript, setPendingScript,
    templates, setTemplates, fetchTemplates,
    loadPrivateData, getAuthHeaders,
  }), [supabase, SUPABASE_ENABLED, user, authSessionLoading, projects, scripts, historyLoading, usageStatus, selectedProjectId, activeScriptId, pendingScript, templates, fetchTemplates, loadPrivateData, getAuthHeaders]);

  return <WebWeaveContext.Provider value={value}>{children}</WebWeaveContext.Provider>;
}

export function useWebWeave() {
  const ctx = useContext(WebWeaveContext);
  if (!ctx) throw new Error('useWebWeave must be used within WebWeaveProvider');
  return ctx;
}
