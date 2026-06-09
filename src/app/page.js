'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Code2,
  Copy,
  Download,
  Folder,
  Globe,
  Home,
  Loader,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Search,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import styles from './page.module.css';

const FRAMEWORKS = [
  { value: 'playwright_js', label: 'Playwright JavaScript' },
  { value: 'playwright_python', label: 'Playwright Python' },
  { value: 'puppeteer_js', label: 'Puppeteer JavaScript' },
  { value: 'selenium_python', label: 'Selenium Python' },
  { value: 'cypress_js', label: 'Cypress JavaScript' },
];

export default function WebWeave() {
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

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('webweave-theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('webweave-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const selectedFrameworkLabel = FRAMEWORKS.find((item) => item.value === framework)?.label || framework;

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

      setResult(data);
      setLogs(data.logs || []);
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

  const hasWorkspace = loading || Boolean(result);

  return (
    <div className={`${styles.container} ${isDark ? styles.darkMode : styles.lightMode}`}>
      <aside className={styles.sidebar}>
        <div className={styles.workspaceSwitch}>
          <img src="/logo" alt="WebWeave logo" className={styles.brandLogo} />
          <div>
            <strong>WebWeave</strong>
            <span>Personal Lab</span>
          </div>
          <PanelLeft size={17} />
        </div>

        <button type="button" className={styles.newChatButton} onClick={() => { setResult(null); setLogs([]); setError(''); }}>
          New Automation
          <Sparkles size={16} />
        </button>

        <nav className={styles.navList}>
          <a className={styles.navActive}><Home size={18} /> Home</a>
          <a><Search size={18} /> Search</a>
          <a><Folder size={18} /> Projects</a>
          <a><MessageSquare size={18} /> Runs</a>
          <a><Code2 size={18} /> Templates</a>
        </nav>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarHeading}>Recent runs</div>
          <button type="button" className={styles.recentItem}>OrangeHRM PIM flow <MoreHorizontal size={15} /></button>
          <button type="button" className={styles.recentItem}>SauceDemo checkout <MoreHorizontal size={15} /></button>
          <button type="button" className={styles.recentItem}>Framework validation <MoreHorizontal size={15} /></button>
        </div>

        <div className={styles.sidebarFooter}>
          <span>Local beta</span>
          <strong>{selectedFrameworkLabel}</strong>
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
              </div>
            </header>

            <main className={styles.workspaceLayout}>
              <section className={`${styles.promptRail} ${styles.appearIn}`}>
                <div className={styles.chatCard}>
                  <p className={styles.kicker}>Prompt</p>
                  <h1>Automation objective</h1>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Target URL</label>
                    <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} className={styles.input} disabled={loading} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Objective</label>
                    <textarea value={objective} onChange={(event) => setObjective(event.target.value)} className={styles.textarea} disabled={loading} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Framework</label>
                    <select value={framework} onChange={(event) => setFramework(event.target.value)} className={styles.select} disabled={loading}>
                      {FRAMEWORKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
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

              <div className={styles.heroComposer}>
                <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ask WebWeave to automate..." className={styles.heroPrompt} disabled={loading} />
                <div className={styles.composerMeta}>
                  <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/login" className={styles.inlineUrl} disabled={loading} />
                  <select value={framework} onChange={(event) => setFramework(event.target.value)} className={styles.inlineSelect} disabled={loading}>
                    {FRAMEWORKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
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
    </div>
  );
}
