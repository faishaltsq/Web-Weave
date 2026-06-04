'use client';

import React, { useState } from 'react';
import {
  Zap,
  Copy,
  Download,
  Terminal,
  AlertCircle,
  Check,
  RefreshCw,
  Code2
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [framework, setFramework] = useState('playwright_js');

  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [fileExtension, setFileExtension] = useState('js');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    let domain = 'automation';
    try {
      const parsed = new URL(url);
      domain = parsed.hostname.replace('www.', '').split('.')[0];
    } catch (_) { }

    link.href = blobUrl;
    link.download = `${domain}_automation.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Harap masukkan URL website target.');
      return;
    }
    if (!prompt) {
      setError('Harap masukkan tujuan automasi.');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedCode('');
    setTargetTitle('');
    setLogs(['Memulai proses generasi...']);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt, framework }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan pada server.');
      }

      if (data.success) {
        setGeneratedCode(data.code);
        setFileExtension(data.fileExtension);
        setTargetTitle(data.title);
        setLogs(prev => [...prev, ...data.logs]);
      } else {
        throw new Error('Gagal menghasilkan skrip automasi.');
      }

    } catch (err) {
      setError(err.message);
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const getFrameworkLabel = (fw) => {
    switch (fw) {
      case 'playwright_js': return 'Playwright (JS)';
      case 'playwright_python': return 'Playwright (Python)';
      case 'puppeteer_js': return 'Puppeteer (JS)';
      case 'selenium_python': return 'Selenium (Python)';
      case 'cypress_js': return 'Cypress (JS)';
      default: return 'Playwright';
    }
  };

  return (
    <div className={styles.container}>
      {/* Header section */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Zap size={36} className={styles.logoIcon} />
          <span className={styles.title}>WebWeave</span>
        </div>
        <p className={styles.subtitle}>
          Generate production-ready web automation scripts instantly from a URL and natural language prompts.
        </p>
      </header>

      {/* Main Grid: Control Panel vs Code Output */}
      <main className={styles.mainGrid}>

        {/* Left Side: Forms & Controls */}
        <section className={styles.card}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Target URL Input */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Target Website URL
              </label>
              <input
                type="url"
                required
                className={styles.input}
                placeholder="https://example.com/login"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {/* Automation Goal Prompt */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Automation Objective
              </label>
              <textarea
                required
                className={styles.textarea}
                placeholder="Contoh: Login menggunakan username 'admin' dan password 'rahasia123', kemudian verifikasi bahwa teks 'Selamat Datang' muncul di dashboard."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Framework Selector */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Target Automation Framework
              </label>
              <select
                className={styles.select}
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              >
                <option value="playwright_js">Playwright (JavaScript - Node.js)</option>
                <option value="playwright_python">Playwright (Python)</option>
                <option value="puppeteer_js">Puppeteer (JavaScript - Node.js)</option>
                <option value="selenium_python">Selenium (Python)</option>
                <option value="cypress_js">Cypress (JavaScript)</option>
              </select>
            </div>

            {/* Error Banner */}
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle className={styles.errorIcon} size={18} />
                <div>
                  <strong>Error: </strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className={styles.spinner} size={18} />
                  Mengekstrak DOM & Membuat Kode...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Generate Script
                </>
              )}
            </button>
          </form>

          {/* Logs Terminal Area */}
          {logs.length > 0 && (
            <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
              <label className={styles.label}>
                <Terminal size={16} /> Status Proses (Console Logs)
              </label>
              <div className={styles.logsCard}>
                {logs.map((log, index) => (
                  <div key={index} className={styles.logLine}>
                    <span className={styles.logTimestamp}>&gt;</span>
                    <span className={styles.logText}>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Code Output Viewer */}
        <section className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <div className={styles.codeTitleInfo}>
              <Code2 size={18} className={styles.logoIcon} />
              <span className={styles.codeBadge}>{getFrameworkLabel(framework)}</span>
              {targetTitle && (
                <span className={styles.codeTargetTitle} title={targetTitle}>
                  Site: {targetTitle}
                </span>
              )}
            </div>
            {generatedCode && (
              <div className={styles.codeActions}>
                <button
                  onClick={handleCopy}
                  className={`${styles.actionButton} ${copied ? styles.actionButtonActive : ''}`}
                  title="Copy code to clipboard"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className={styles.actionButton}
                  title="Download script file"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            )}
          </div>

          <div className={styles.codeBody}>
            {generatedCode ? (
              <pre className={styles.pre}>
                <code>{generatedCode}</code>
              </pre>
            ) : (
              <div className={styles.emptyCodePlaceholder}>
                <Code2 size={64} className={styles.emptyCodeIcon} />
                <h3>Belum Ada Kode yang Dihasilkan</h3>
                <p style={{ maxWidth: '400px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Masukkan URL target, tujuan automasi, pilih framework, lalu klik <strong>Generate Script</strong>.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          AI-powered web automation script generator. Powered by Playwright + server-side AI.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Note: Beberapa website yang memiliki proteksi bot sangat ketat (Cloudflare CAPTCHA) mungkin akan digenerasi menggunakan struktur DOM default.
        </p>
      </footer>
    </div>
  );
}
