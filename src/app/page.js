'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Loader,
  Monitor,
  Moon,
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

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('webweave-theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('webweave-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const selectedFrameworkLabel = FRAMEWORKS.find((item) => item.value === framework)?.label || framework;

  const handleGenerate = async () => {
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

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt: objective, framework }),
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
    const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    let domain = 'automation';
    try {
      domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    } catch (_) {}

    link.href = blobUrl;
    link.download = `${domain}_automation.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className={`${styles.container} ${isDark ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.backgroundGlow} />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <Monitor size={24} />
            </div>
            <div>
              <span>WebWeave</span>
              <p>AI Automation Lab</p>
            </div>
          </div>

          <p className={styles.subtitle}>Generate Playwright-ready automation from DOM locator intelligence.</p>

          <button
            type="button"
            onClick={() => setIsDark((value) => !value)}
            className={styles.themeToggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className={styles.mainLayout}>
        <aside className={styles.leftPanel}>
          <div className={styles.formCard}>
            <div>
              <p className={styles.kicker}>Script Generator</p>
              <h1 className={styles.formTitle}>Create automation script</h1>
              <p className={styles.formDescription}>Scan target DOM, highlight locator candidates, then generate runnable automation code.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Target Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/login"
                className={styles.input}
                disabled={loading}
              />
              <p className={styles.helperText}>Bisa pakai domain saja, contoh: www.saucedemo.com. WebWeave otomatis memakai https://.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Automation Objective</label>
              <textarea
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Contoh: Login menggunakan {{USERNAME}} dan {{PASSWORD}}, lalu verifikasi dashboard muncul."
                className={styles.textarea}
                disabled={loading}
              />
              <p className={styles.warningText}>Use placeholders like {'{{USERNAME}}'} and {'{{PASSWORD}}'}. Do not enter real credentials.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Framework</label>
              <select
                value={framework}
                onChange={(event) => setFramework(event.target.value)}
                className={styles.select}
                disabled={loading}
              >
                {FRAMEWORKS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button type="button" onClick={handleGenerate} disabled={loading} className={styles.generateButton}>
              {loading ? (
                <>
                  <Loader size={18} className={styles.spinner} />
                  Scanning DOM & Generating Code...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Generate Script
                </>
              )}
            </button>

            {logs.length > 0 && (
              <div className={styles.consoleSection}>
                <h2 className={styles.consoleTitle}>Generation Logs</h2>
                <div className={styles.console}>
                  {logs.map((log, index) => (
                    <div key={`${log}-${index}`} className={styles.consoleLine}>
                      <span className={styles.consolePrompt}>{'>'}</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className={styles.rightPanel}>
          <div className={styles.outputHeader}>
            <div>
              <p className={styles.kicker}>Locator Preview</p>
              <h2>Chromium workspace</h2>
            </div>
            <span className={styles.frameworkBadge}>{selectedFrameworkLabel}</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.browserToolbar}>
              <div className={styles.browserControls}>
                <span className={styles.trafficRed} />
                <span className={styles.trafficAmber} />
                <span className={styles.trafficGreen} />
              </div>
              <div className={styles.addressBar}>{url || 'https://target-site.example'}</div>
              <span className={styles.liveBadge}>{loading ? 'Scanning' : result?.browserPreview ? 'Captured' : 'Ready'}</span>
            </div>

            <div className={styles.previewContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.scanAnimation}>
                    <div className={styles.locatorBoxOne}>button</div>
                    <div className={styles.locatorBoxTwo}>input</div>
                    <div className={styles.locatorBoxThree}>link</div>
                    <div className={styles.scanLine} />
                  </div>
                  <p className={styles.scanningText}>Chromium scanning DOM locators...</p>
                  <div className={styles.pulsingDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : result?.browserPreview ? (
                <img src={result.browserPreview} alt="Locator preview" className={styles.previewImage} />
              ) : (
                <div className={styles.emptyState}>
                  <Monitor size={54} />
                  <h3>Browser preview appears here</h3>
                  <p>Generate a script to see Chromium screenshot with highlighted locator candidates.</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.codeToolbar}>
              <div>
                <p className={styles.kicker}>Generated Code</p>
                <h2>Automation script</h2>
              </div>
              {result?.code && (
                <div className={styles.codeActions}>
                  <button type="button" onClick={handleCopyCode} className={styles.actionButton}>
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button type="button" onClick={handleDownloadCode} className={styles.actionButton}>
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className={styles.codeBlock}>
              {result?.code ? (
                <pre className={styles.code}><code>{result.code}</code></pre>
              ) : (
                <div className={styles.codeEmptyState}>
                  <p>Your generated automation script will appear here after WebWeave finishes scanning.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
