'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  CheckCircle,
  Code2,
  Copy,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  Folder,
  Globe,
  Home,
  KeyRound,
  Loader,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { createBrowserSupabaseClient, hasSupabaseBrowserConfig } from '@/lib/supabase/browser';
import PricingPage from '@/components/PricingPage';
import styles from './page.module.css';

const FRAMEWORKS = [
  { value: 'playwright_js', label: 'Playwright JavaScript' },
  { value: 'playwright_python', label: 'Playwright Python' },
  { value: 'puppeteer_js', label: 'Puppeteer JavaScript' },
  { value: 'selenium_python', label: 'Selenium Python' },
  { value: 'cypress_js', label: 'Cypress JavaScript' },
];

const SUPABASE_ENABLED = hasSupabaseBrowserConfig();

function getFileExtension(frameworkValue) {
  const extMap = {
    playwright_js: 'js',
    playwright_python: 'py',
    puppeteer_js: 'js',
    selenium_python: 'py',
    cypress_js: 'cy.js',
  };

  return extMap[frameworkValue] || 'txt';
}

function getTargetDomain(rawUrl) {
  try {
    const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(normalized).hostname;
  } catch {
    return rawUrl.trim().slice(0, 120);
  }
}

export default function WebWeave() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('sign_in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSessionLoading, setAuthSessionLoading] = useState(SUPABASE_ENABLED);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [projects, setProjects] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [objective, setObjective] = useState('');
  const [framework, setFramework] = useState('playwright_js');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [generationFeedback, setGenerationFeedback] = useState('');
  const [activePromptArea, setActivePromptArea] = useState('');
  const [activeDropdown, setActiveDropdown] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [newAutomationMenuOpen, setNewAutomationMenuOpen] = useState(false);
  const [recentChatsOpen, setRecentChatsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scriptSearch, setScriptSearch] = useState('');
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingClosing, setPricingClosing] = useState(false);
  const promptAnimationTimer = useRef(null);
  const dropdownAnimationTimer = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('webweave-theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('webweave-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    return () => {
      if (promptAnimationTimer.current) window.clearTimeout(promptAnimationTimer.current);
      if (dropdownAnimationTimer.current) window.clearTimeout(dropdownAnimationTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const closeProfileMenuFromOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };

    const closeProfileMenuWithEscape = (event) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeProfileMenuFromOutside);
    document.addEventListener('keydown', closeProfileMenuWithEscape);

    return () => {
      document.removeEventListener('pointerdown', closeProfileMenuFromOutside);
      document.removeEventListener('keydown', closeProfileMenuWithEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!supabase) {
      setAuthSessionLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user || null);
      })
      .catch((err) => {
        if (mounted) setAuthError(err.message);
      })
      .finally(() => {
        if (mounted) setAuthSessionLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setScripts([]);
      setSelectedProjectId('');
      return;
    }

    loadPrivateData();
  }, [user]);

  const selectedFrameworkLabel = FRAMEWORKS.find((item) => item.value === framework)?.label || framework;
  const authEmailTrimmed = authEmail.trim().toLowerCase();
  const authEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmailTrimmed);
  const authPasswordValid = authPassword.length >= 6;
  const authActionLabel = authMode === 'sign_up' ? 'Create account' : 'Sign in';
  const authSubmitDisabled = authLoading || !authEmailValid || !authPasswordValid;
  const profileName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Sign in';
  const profileEmail = user?.email || (SUPABASE_ENABLED ? 'Connect account' : 'Supabase not configured');
  const profileAvatar = user?.user_metadata?.avatar_url;
  const scriptSearchTerm = scriptSearch.trim().toLowerCase();
  const visibleScripts = scripts.filter((script) => {
    const scriptLabel = FRAMEWORKS.find((item) => item.value === script.framework)?.label || script.framework || '';
    return !scriptSearchTerm || scriptLabel.toLowerCase().includes(scriptSearchTerm) || (script.prompt || '').toLowerCase().includes(scriptSearchTerm);
  });

  const triggerTemporaryAnimation = (setter, timerRef, value) => {
    setter('');
    if (timerRef.current) window.clearTimeout(timerRef.current);

    window.requestAnimationFrame(() => {
      setter(value);
      timerRef.current = window.setTimeout(() => setter(''), 520);
    });
  };

  const triggerPromptAnimation = (area) => {
    triggerTemporaryAnimation(setActivePromptArea, promptAnimationTimer, area);
  };

  const triggerDropdownAnimation = (dropdownName) => {
    triggerTemporaryAnimation(setActiveDropdown, dropdownAnimationTimer, dropdownName);
  };

  const handleDropdownPointerDown = (event, dropdownName) => {
    event.stopPropagation();
    triggerDropdownAnimation(dropdownName);
  };

  const getAuthHeaders = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) throw new Error('Sign in required.');

    return { Authorization: `Bearer ${token}` };
  };

  const loadPrivateData = async () => {
    if (!user || !supabase) return;

    setHistoryLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [projectResponse, scriptResponse] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/generated-scripts', { headers }),
      ]);

      const projectData = await projectResponse.json();
      const scriptData = await scriptResponse.json();

      if (projectData.success) {
        const nextProjects = projectData.projects || [];
        setProjects(nextProjects);
        if (!selectedProjectId && nextProjects.length) setSelectedProjectId(nextProjects[0].id);
      }

      if (scriptData.success) setScripts(scriptData.scripts || []);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const createProject = async (name = 'Default project') => {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        target_domain: getTargetDomain(url),
        description: 'Created automatically from WebWeave generation.',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to create project.');

    setProjects((prev) => [data.project, ...prev]);
    setSelectedProjectId(data.project.id);
    return data.project;
  };

  const saveGeneratedScript = async (generatedData, promptText) => {
    if (!user || !supabase || !generatedData?.code) return null;

    const headers = await getAuthHeaders();
    const project = selectedProjectId
      ? projects.find((item) => item.id === selectedProjectId)
      : (projects[0] || await createProject('Default project'));

    if (!project?.id) throw new Error('Project is required before saving script.');

    const response = await fetch('/api/generated-scripts', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        framework,
        prompt: promptText,
        target_url: url,
        code: generatedData.code,
        quality_gate: generatedData.qualityGate || null,
        quality_checks: generatedData.qualityChecks || [],
        locator_summary: generatedData.locatorSummary || [],
        provider: generatedData.provider || null,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save generated script.');

    await loadPrivateData();
    return data.script;
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) return;

    const email = authEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Use a valid email address.');
      return;
    }

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const credentials = { email, password: authPassword };
      const { data, error: authRequestError } = authMode === 'sign_up'
        ? await supabase.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: window.location.origin },
        })
        : await supabase.auth.signInWithPassword(credentials);

      if (authRequestError) throw authRequestError;

      setAuthMessage(authMode === 'sign_up' && !data?.session
        ? 'Account created. Check your email to confirm before signing in.'
        : 'Signed in. Project history is ready.');
      setAuthEmail(email);
      setAuthPassword('');
      if (data?.session) setProfileMenuOpen(false);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    const { error: googleAuthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (googleAuthError) {
      setAuthError(googleAuthError.message);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setScripts([]);
    setSelectedProjectId('');
    setAuthMessage('Signed out.');
    setProfileMenuOpen(false);
  };

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setAuthError('');
    setAuthMessage('');
  };

  const handleOpenScript = (script) => {
    setUrl(script.target_url || '');
    setObjective(script.prompt || '');
    setFramework(script.framework || 'playwright_js');
    setSelectedProjectId(script.project_id || '');
    setResult({
      success: true,
      code: script.code,
      fileExtension: getFileExtension(script.framework),
      qualityGate: script.quality_gate,
      qualityChecks: script.quality_checks || [],
      locatorSummary: script.locator_summary || [],
      logs: [`Loaded saved script from ${new Date(script.created_at).toLocaleString()}.`],
    });
    setLogs([`Loaded saved script from ${new Date(script.created_at).toLocaleString()}.`]);
    setError('');
  };

  const startNewAutomation = () => {
    setResult(null);
    setLogs([]);
    setError('');
    setObjective('');
    setUrl('');
    setGenerationFeedback('');
    setProfileMenuOpen(false);
    setWorkspaceMenuOpen(false);
    setNewAutomationMenuOpen(false);
  };

  const handleGenerate = async (options = {}) => {
    if (!url.trim()) {
      setError('Harap masukkan URL website target.');
      return;
    }

    if (!objective.trim()) {
      setError('Harap masukkan tujuan automasi.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setLogs(['Memulai proses generasi...']);

    const feedbackText = typeof options.feedback === 'string' ? options.feedback.trim() : '';
    const requestPrompt = feedbackText
      ? `${objective.trim()}\n\nRegeneration feedback from previous output:\n${feedbackText}`
      : objective.trim();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt: requestPrompt, framework }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan pada server.');
      }

      if (!data.success) {
        throw new Error(data.error || 'Gagal menghasilkan skrip automasi.');
      }

      let savedScript = null;
      let saveError = '';
      try {
        savedScript = await saveGeneratedScript(data, requestPrompt);
      } catch (err) {
        saveError = err.message;
      }

      setResult(savedScript ? { ...data, savedScriptId: savedScript.id } : data);
      setLogs([
        ...(data.logs || []),
        ...(savedScript ? [`Saved to project history (${savedScript.id}).`] : []),
        ...(saveError ? [`History save skipped: ${saveError}`] : []),
      ]);
      if (feedbackText) setGenerationFeedback('');
    } catch (err) {
      setError(err.message);
      setLogs((prev) => [...prev, `Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    if (!result?.code) return;

    const ext = result.fileExtension || 'txt';
    const frameworkSlug = framework.replace(/_/g, '-');
    const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = `${frameworkSlug}_automation.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleOpenPricing = () => {
    setPricingClosing(false);
    setShowPricing(true);
    setProfileMenuOpen(false);
  };

  const handleClosePricing = () => {
    if (pricingClosing) return;
    setPricingClosing(true);
    window.setTimeout(() => {
      setShowPricing(false);
      setPricingClosing(false);
    }, 220);
  };

  const handlePricingCheckout = async ({ plan, billingCycle }) => {
    if (!user || !supabase) {
      return { success: false, error: 'Sign in dulu sebelum checkout.' };
    }

    const headers = await getAuthHeaders();
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, billingCycle }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Checkout belum bisa dibuat.' };
    }

    return { success: true, checkoutUrl: data.checkoutUrl };
  };

  const hasWorkspace = loading || Boolean(result);
  const renderAuthForm = () => {
    if (!SUPABASE_ENABLED) return <div className={styles.sidebarHint}>Supabase not configured.</div>;
    if (authSessionLoading) return <div className={styles.authStatusLine}><Loader size={15} className={styles.spinner} /> Checking session...</div>;

    return (
        <form className={styles.authForm} onSubmit={handleAuthSubmit}>
          <button type="button" className={`${styles.secondaryButton} ${styles.googleButton}`} onClick={handleGoogleSignIn} disabled={authLoading}>
            <span className={styles.googleMark}>G</span>
            Continue with Google
          </button>
          <div className={styles.oauthDivider}><span /> or use email <span /></div>
          <div className={styles.authModeToggle}>
            <button type="button" className={`${styles.authModeButton} ${authMode === 'sign_in' ? styles.authModeActive : ''}`} onClick={() => switchAuthMode('sign_in')}>Login</button>
            <button type="button" className={`${styles.authModeButton} ${authMode === 'sign_up' ? styles.authModeActive : ''}`} onClick={() => switchAuthMode('sign_up')}>Register</button>
          </div>
          <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="email@example.com" className={styles.authInput} autoComplete="email" required />
          <div className={styles.authPasswordWrap}>
            <input type={showPassword ? 'text' : 'password'} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Password min. 6 chars" className={styles.authInput} autoComplete={authMode === 'sign_up' ? 'new-password' : 'current-password'} required minLength={6} />
            <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {authError && <div className={styles.authError}>{authError}</div>}
          {authMessage && <div className={styles.authMessage}>{authMessage}</div>}
          <button type="submit" className={styles.secondaryButton} disabled={authSubmitDisabled}>
            {authLoading ? <Loader size={15} className={styles.spinner} /> : <KeyRound size={15} />}
            {authActionLabel}
          </button>
          <p className={styles.authSmall}>{authMode === 'sign_up' ? 'Register to save scripts, projects, and generation history.' : 'Login to restore projects and saved scripts.'}</p>
        </form>
    );
  };

  const renderProfileMenu = () => (
    <div className={`${styles.profileMenu} ${user ? '' : styles.profileAuthMenu}`}>
      {user ? (
        <>
          <div className={styles.profileMenuHeader}>
            <strong>{profileName}</strong>
            <span>{profileEmail}</span>
          </div>
          <button type="button" className={styles.profileMenuItem}><Settings size={17} /> Account Settings</button>
          <button type="button" className={styles.profileMenuItem} onClick={handleOpenPricing}><DollarSign size={17} /> Pricing</button>
          <button type="button" className={styles.profileMenuItem} onClick={handleSignOut}><LogOut size={17} /> Sign Out</button>
        </>
      ) : (
        <>
          <div className={styles.profileMenuHeader}>
            <strong>Sign in to WebWeave</strong>
            <span>Save scripts, projects, and generation history.</span>
          </div>
          {renderAuthForm()}
        </>
      )}
    </div>
  );

  return (
    <div className={`${styles.container} ${isDark ? styles.darkMode : styles.lightMode} ${sidebarCompact ? styles.sidebarCompact : ''}`}>
      {sidebarCompact && (
        <button type="button" className={styles.expandButton} onClick={() => setSidebarCompact(false)} title="Expand sidebar" aria-label="Expand sidebar">
          <PanelRight size={17} />
        </button>
      )}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarMain}>
          <div className={styles.workspaceWrap}>
            <button type="button" className={styles.workspaceSwitch} onClick={() => { setWorkspaceMenuOpen((value) => !value); setNewAutomationMenuOpen(false); }} aria-expanded={workspaceMenuOpen}>
              <img src="/logo" alt="WebWeave logo" className={styles.brandLogo} />
              <div>
                <strong>Personal</strong>
                <span>WebWeave Lab</span>
              </div>
              <ChevronDown size={15} className={workspaceMenuOpen ? styles.chevronOpen : ''} />
            </button>
            <button type="button" className={styles.sidebarIconButton} onClick={() => setSidebarCompact((value) => !value)} title={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={sidebarCompact}>
              {sidebarCompact ? <PanelRight size={17} /> : <PanelLeft size={17} />}
            </button>
            {workspaceMenuOpen && (
              <div className={styles.workspaceMenu}>
                <button type="button" className={styles.workspaceMenuItem} onClick={() => setWorkspaceMenuOpen(false)}>
                  <img src="/logo" alt="" />
                  <span><strong>Personal</strong><small>Current workspace</small></span>
                </button>
                <button type="button" className={styles.workspaceMenuItem} onClick={() => setWorkspaceMenuOpen(false)}>
                  <Sparkles size={16} />
                  <span><strong>WebWeave Lab</strong><small>Private beta</small></span>
                </button>
              </div>
            )}
          </div>

          <div className={styles.newChatWrap}>
            <button type="button" className={styles.newChatButton} onClick={startNewAutomation}>New Automation</button>
            <button type="button" className={styles.newChatDropdown} onClick={() => { setNewAutomationMenuOpen((value) => !value); setWorkspaceMenuOpen(false); }} aria-label="Open new automation options" aria-expanded={newAutomationMenuOpen}>
              <ChevronDown size={16} className={newAutomationMenuOpen ? styles.chevronOpen : ''} />
            </button>
            {newAutomationMenuOpen && (
              <div className={styles.newAutomationMenu}>
                <button type="button" onClick={startNewAutomation}><Sparkles size={16} /> Blank automation</button>
                <button type="button" onClick={() => { setObjective('Login with {{USERNAME}} and {{PASSWORD}}, then validate dashboard loads.'); setNewAutomationMenuOpen(false); }}>Use login template</button>
              </div>
            )}
          </div>

          <button type="button" className={`${styles.sidebarSearch} ${searchOpen ? styles.sidebarSearchOpen : ''}`} onClick={() => setSearchOpen((value) => !value)} aria-expanded={searchOpen}>
            <Search size={18} /> <span>Search</span>
          </button>
          {searchOpen && (
            <input type="search" value={scriptSearch} onChange={(event) => setScriptSearch(event.target.value)} className={styles.sidebarSearchInput} placeholder="Search saved scripts..." autoFocus />
          )}

          <nav className={styles.navList}>
            <button type="button" className={styles.navActive}><Home size={18} /> Home</button>
            <button type="button" className={styles.navDisabled} aria-disabled="true" data-tooltip="Coming in new Updates"><Folder size={18} /> Projects</button>
            <button type="button" className={styles.navDisabled} aria-disabled="true" data-tooltip="Coming in new Updates"><MessageSquare size={18} /> Chats</button>
            <button type="button" className={styles.navDisabled} aria-disabled="true" data-tooltip="Coming in new Updates"><Code2 size={18} /> Templates</button>
          </nav>

          <div className={styles.sidebarSection}>
            <button type="button" className={styles.sidebarSectionHeader} onClick={() => setRecentChatsOpen((value) => !value)} aria-expanded={recentChatsOpen}>
              <span>Recent Chats</span><ChevronDown size={15} className={recentChatsOpen ? styles.chevronOpen : ''} />
            </button>
            {recentChatsOpen && (
              <>
            {!SUPABASE_ENABLED && <div className={styles.sidebarHint}>Add Supabase env vars to enable history.</div>}
            {SUPABASE_ENABLED && !user && <div className={styles.sidebarHint}>Sign in to save generated scripts.</div>}
            {historyLoading && <div className={styles.sidebarHint}>Loading history...</div>}
            {user && !historyLoading && visibleScripts.length === 0 && <div className={styles.sidebarHint}>{scriptSearchTerm ? 'No scripts match search.' : 'No saved scripts yet.'}</div>}
            {visibleScripts.slice(0, 5).map((script) => (
              <button type="button" key={script.id} className={styles.recentItem} onClick={() => handleOpenScript(script)}>
                <span>{FRAMEWORKS.find((item) => item.value === script.framework)?.label || script.framework}</span>
                <MoreHorizontal size={15} />
              </button>
            ))}
              </>
            )}
          </div>
        </div>

        <div className={styles.sidebarAccountDock} ref={profileMenuRef}>
          {profileMenuOpen && renderProfileMenu()}
          <button type="button" className={styles.profileButton} onClick={() => setProfileMenuOpen((value) => !value)} aria-expanded={profileMenuOpen}>
            <span className={styles.profileAvatar}>{profileAvatar ? <img src={profileAvatar} alt="" referrerPolicy="no-referrer" /> : <img src="/logo" alt="" />}</span>
            <span className={styles.profileText}><strong>{profileName}</strong><small>{profileEmail}</small></span>
          </button>
        </div>
      </aside>

      <section className={styles.appSurface}>
        {hasWorkspace ? (
          <>
            <header className={styles.workspaceHeader}>
              <div className={styles.breadcrumbs}>
                <span>Drafts</span>
                <span>/</span>
                <strong>Automation run</strong>
              </div>
              <div className={styles.headerActions}>
                <button type="button" onClick={() => setIsDark((value) => !value)} className={styles.iconButton} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <span className={styles.publishPill}>Private beta</span>
                {user && <span className={styles.publishPill}><Save size={14} /> History on</span>}
              </div>
            </header>

            <main className={styles.workspaceLayout}>
              <section className={`${styles.promptRail} ${styles.appearIn}`}>
                <div className={`${styles.chatCard} ${styles.promptCard} ${activePromptArea === 'workspace' ? styles.promptPulse : ''}`} onPointerDown={() => triggerPromptAnimation('workspace')}>
                  <p className={styles.kicker}>Prompt</p>
                  <h1>Automation objective</h1>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Target URL</label>
                    <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} onFocus={() => triggerPromptAnimation('workspace')} className={styles.input} disabled={loading} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Objective</label>
                    <textarea value={objective} onChange={(event) => setObjective(event.target.value)} onFocus={() => triggerPromptAnimation('workspace')} className={styles.textarea} disabled={loading} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Framework</label>
                    <select value={framework} onChange={(event) => setFramework(event.target.value)} onPointerDown={(event) => handleDropdownPointerDown(event, 'workspace-framework')} onFocus={() => triggerDropdownAnimation('workspace-framework')} className={`${styles.select} ${activeDropdown === 'workspace-framework' ? styles.dropdownPulse : ''}`} disabled={loading}>
                      {FRAMEWORKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                  {user && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Project</label>
                      <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} onPointerDown={(event) => handleDropdownPointerDown(event, 'workspace-project')} onFocus={() => triggerDropdownAnimation('workspace-project')} className={`${styles.select} ${activeDropdown === 'workspace-project' ? styles.dropdownPulse : ''}`} disabled={loading}>
                        <option value="">Auto-create default project</option>
                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </div>
                  )}
                  {error && <div className={styles.errorBanner}><AlertCircle size={18} /><span>{error}</span></div>}
                  <button type="button" onClick={() => handleGenerate()} disabled={loading} className={styles.generateButton}>
                    {loading ? <Loader size={18} className={styles.spinner} /> : <Zap size={18} />}
                    {loading ? 'Generating...' : 'Generate again'}
                  </button>
                </div>

                <div className={styles.chatCard}>
                  <p className={styles.kicker}>Run logs</p>
                  <div className={styles.console}>
                    {(logs.length ? logs : ['Waiting for generation...']).map((log, index) => (
                      <div key={`${log}-${index}`} className={styles.consoleLine}>
                        <span className={styles.consolePrompt}>{'>'}</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result?.code && (
                  <div className={styles.chatCard}>
                    <p className={styles.kicker}>Regenerate</p>
                    <h2>Improve with feedback</h2>
                    <textarea value={generationFeedback} onChange={(event) => setGenerationFeedback(event.target.value)} className={styles.feedbackTextarea} placeholder="Tell WebWeave what failed or what should be stricter." disabled={loading} />
                    <button type="button" className={styles.regenerateButton} disabled={loading || !generationFeedback.trim()} onClick={() => handleGenerate({ feedback: generationFeedback })}>
                      {loading ? <Loader size={16} className={styles.spinner} /> : <Zap size={16} />}
                      Regenerate with Feedback
                    </button>
                  </div>
                )}
              </section>

              <section className={`${styles.workspacePanel} ${styles.appearInDelayed}`}>
                <div className={`${styles.previewShell} ${loading ? styles.loadingPreviewShell : ''}`}>
                  <div className={styles.previewTopbar}>
                    <div className={styles.previewTabs}>
                      <span className={styles.activeTool}><Monitor size={16} /> Preview</span>
                      <span><Code2 size={16} /> Code</span>
                      <span><Globe size={16} /> DOM</span>
                    </div>
                    <div className={styles.addressBar}>{url || 'https://target-site.example'}</div>
                    <span className={styles.liveBadge}>{loading ? 'Scanning' : result?.browserPreview ? 'Captured' : 'Ready'}</span>
                  </div>
                  <div className={styles.previewContainer}>
                    {loading ? (
                      <div className={styles.loadingState}>
                        <div className={styles.headlessRunner}>
                          <div className={styles.runnerHeader}>
                            <span className={styles.runnerDot} />
                            <strong>Playwright Chromium</strong>
                            <code>headless: true</code>
                          </div>
                          <div className={styles.runnerBody}>
                            <div className={styles.runnerCommand}>await chromium.launch({'{ headless: true }'})</div>
                            <div className={styles.runnerStep}><span />Opening target URL</div>
                            <div className={styles.runnerStep}><span />Extracting interactive DOM</div>
                            <div className={styles.runnerStep}><span />Ranking locator candidates</div>
                            <div className={styles.runnerStep}><span />Sending grounded prompt to AI</div>
                            <div className={styles.locatorRadar}>
                              <div>input[name=&quot;username&quot;]</div>
                              <div>button[type=&quot;submit&quot;]</div>
                              <div>a[href*=&quot;pim&quot;]</div>
                            </div>
                          </div>
                        </div>
                        <p className={styles.scanningText}>AI is running Playwright in headless mode and searching stable locators...</p>
                      </div>
                    ) : result?.browserPreview ? (
                      <img src={result.browserPreview} alt="Locator preview" className={styles.previewImage} />
                    ) : (
                      <div className={styles.emptyState}><Monitor size={50} /><h3>Preview will appear here</h3></div>
                    )}
                  </div>
                </div>

                {result?.locatorSummary?.length > 0 && (
                  <div className={styles.locatorStrip}>
                    {result.locatorSummary.slice(0, 4).map((item, index) => (
                      <div key={`${item.selector}-${index}`} className={styles.locatorItemCompact}>
                        <span>{item.score}</span>
                        <code>{item.selector}</code>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`${styles.codePanel} ${styles.appearInSlow}`}>
                  <div className={styles.codeToolbar}>
                    <div>
                      <p className={styles.kicker}>Generated code</p>
                      <h2>{selectedFrameworkLabel}</h2>
                    </div>
                    {result?.code && (
                      <div className={styles.codeActions}>
                        {result?.qualityGate && (
                          <span className={`${styles.gateBadge} ${styles[`gate${result.qualityGate.status}`] || ''}`}>
                            Gate: {result.qualityGate.status}
                          </span>
                        )}
                        <button type="button" onClick={handleCopyCode} className={styles.actionButton}>{copied ? <CheckCircle size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button>
                        <button type="button" onClick={handleDownloadCode} className={styles.actionButton}><Download size={16} />Download</button>
                      </div>
                    )}
                  </div>

                  {result?.qualityChecks?.length > 0 && (
                    <div className={styles.qualityPanel}>
                      {result.qualityChecks.map((check, index) => (
                        <div key={`${check.label}-${index}`} className={`${styles.qualityItem} ${styles[`quality${check.status}`] || ''}`}>
                          <span>{check.status}</span>
                          <strong>{check.label}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.codeBlock}>
                    {result?.code ? <pre className={styles.code}><code>{result.code}</code></pre> : <div className={styles.codeEmptyState}>Code will appear below the headless browser preview.</div>}
                  </div>
                </div>
              </section>
            </main>
          </>
        ) : (
          <main className={styles.heroMode}>
            <button type="button" onClick={() => setIsDark((value) => !value)} className={styles.floatingTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={styles.heroContent}>
              <div className={styles.heroLogo}><img src="/logo" alt="WebWeave logo" /> WebWeave</div>
              <h1>What do you want to automate?</h1>
              <p>Describe a QA flow. WebWeave will scan the page in headless Chromium, rank locators, then generate script code.</p>

              <div className={`${styles.heroComposer} ${activePromptArea === 'hero' ? styles.promptPulse : ''}`} onPointerDown={() => triggerPromptAnimation('hero')}>
                <textarea value={objective} onChange={(event) => setObjective(event.target.value)} onFocus={() => triggerPromptAnimation('hero')} placeholder="Ask WebWeave to automate..." className={styles.heroPrompt} disabled={loading} />
                <div className={styles.composerMeta}>
                  <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} onFocus={() => triggerPromptAnimation('hero')} placeholder="https://example.com/login" className={styles.inlineUrl} disabled={loading} />
                  <select value={framework} onChange={(event) => setFramework(event.target.value)} onPointerDown={(event) => handleDropdownPointerDown(event, 'hero-framework')} onFocus={() => triggerDropdownAnimation('hero-framework')} className={`${styles.inlineSelect} ${activeDropdown === 'hero-framework' ? styles.dropdownPulse : ''}`} disabled={loading}>
                    {FRAMEWORKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  {user && (
                    <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} onPointerDown={(event) => handleDropdownPointerDown(event, 'hero-project')} onFocus={() => triggerDropdownAnimation('hero-project')} className={`${styles.inlineSelect} ${activeDropdown === 'hero-project' ? styles.dropdownPulse : ''}`} disabled={loading}>
                      <option value="">Auto project</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => handleGenerate()} disabled={loading} className={styles.sendButton}>
                    {loading ? <Loader size={18} className={styles.spinner} /> : <Zap size={18} />}
                    Generate
                  </button>
                </div>
              </div>

              {error && <div className={styles.heroError}><AlertCircle size={18} /> {error}</div>}
              <p className={styles.securityNote}>Use placeholders like {'{{USERNAME}}'} and {'{{PASSWORD}}'}. Do not submit real credentials.</p>
            </div>
          </main>
        )}
      </section>

      {/* Pricing Page Modal */}
      {showPricing && (
        <div className={`${styles.pricingModal} ${pricingClosing ? styles.pricingModalClosing : ''}`}>
          <div className={styles.pricingModalBackdrop} onClick={handleClosePricing} />
          <div className={styles.pricingModalContent}>
            <button
              type="button"
              className={styles.pricingModalClose}
              onClick={handleClosePricing}
              aria-label="Close pricing"
            >
              ✕
            </button>
            <PricingPage onClose={handleClosePricing} onCheckout={handlePricingCheckout} />
          </div>
        </div>
      )}
    </div>
  );
}
