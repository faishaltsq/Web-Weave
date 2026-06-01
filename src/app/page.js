'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Copy,
  Download,
  Terminal,
  Key,
  AlertCircle,
  Check,
  RefreshCw,
  Code2,
  ChevronDown
} from 'lucide-react';
import styles from './page.module.css';

// Provider configurations with 2026 latest models
const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    label: 'Google DeepMind',
    placeholder: 'AIzaSy...',
    color: '#4285F4',
    envHint: 'GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Gemini 2.0 Flash — cepat & efisien',
    defaultModel: 'gemini-2.0-flash',
    autoSelect: true
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    label: 'OpenAI',
    placeholder: 'sk-...',
    color: '#10a37f',
    envHint: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-5 / o4 series — 2026 frontier models',
    defaultModel: 'gpt-5.4',
    autoSelect: true
  },
  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    color: '#d4a574',
    envHint: 'ANTHROPIC_API_KEY',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude 4 Opus/Sonnet — 2026 best code quality',
    defaultModel: 'claude-opus-4-8',
    autoSelect: true
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'OpenRouter',
    placeholder: 'sk-or-...',
    color: '#6366f1',
    envHint: 'OPENROUTER_API_KEY',
    keyUrl: 'https://openrouter.ai/keys',
    description: '100+ models — Llama 4, Qwen 3, DeepSeek V3',
    defaultModel: 'meta-llama/llama-4-maverick',
    autoSelect: true
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode Go',
    label: 'OpenCode Go',
    placeholder: 'oc-...',
    color: '#f59e0b',
    envHint: 'OPENCODE_API_KEY',
    keyUrl: 'https://opencode.ai/auth',
    description: 'DeepSeek V4, Qwen 3.7, Kimi K2.6 — tested & reliable',
    defaultModel: 'deepseek-v4-flash',
    autoSelect: true
  }
};

const OPENROUTER_MODELS = [
  // ── 2026 Latest Models ──
  { id: 'meta-llama/llama-4-maverick', name: '✦ Llama 4 Maverick (2026 - Recommended)', group: '2026 Latest' },
  { id: 'deepseek/deepseek-v3-0324', name: 'DeepSeek V3 (2026)', group: '2026 Latest' },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen 3 235B (2026)', group: '2026 Latest' },
  { id: 'x-ai/grok-3', name: 'Grok 3 (xAI 2026)', group: '2026 Latest' },
  // ── OpenAI 2026 ──
  { id: 'openai/gpt-5.4', name: 'GPT-5.4 (Frontier 2026)', group: 'OpenAI 2026' },
  { id: 'openai/o4-mini', name: 'o4-mini (Reasoning 2026)', group: 'OpenAI 2026' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Classic)', group: 'OpenAI 2026' },
  // ── Anthropic 2026 ──
  { id: 'anthropic/claude-opus-4-8', name: 'Claude Opus 4.8 (2026 - Recommended)', group: 'Anthropic 2026' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (2026)', group: 'Anthropic 2026' },
  // ── Google 2026 ──
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', group: 'Google' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', group: 'Google' },
  // ── Open-Weight 2026 ──
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', group: 'Open-Weight' },
  { id: 'mistralai/mistral-large-3.1', name: 'Mistral Large 3.1', group: 'Open-Weight' },
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2 (Moonshot)', group: 'Open-Weight' },
  { id: 'minimax/minimax-m1', name: 'MiniMax M1', group: 'Open-Weight' },
  // ── Free Tier ──
  { id: 'google/gemini-2.0-flash-001:free', name: '✦ Gemini 2.0 Flash (Free)', group: 'Free' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: '✦ DeepSeek V3 (Free)', group: 'Free' },
  // ── Custom ──
  { id: '__custom__', name: '🔧 Custom Model ID...', group: 'Custom' },
];

const PROVIDER_MODELS = {
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
  ],
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4 (2026 Frontier - Recommended)' },
    { id: 'o4-mini', name: 'o4-mini (2026 Reasoning)' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (2026 Efficient)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Classic)' }
  ],
  anthropic: [
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8 (2026 - Recommended)' },
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4 (2026)' },
    { id: 'claude-3.5-sonnet-20241022', name: 'Claude 3.5 Sonnet (2024)' }
  ],
  openrouter: OPENROUTER_MODELS,
  opencode: [
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash (Recommended - cheapest)' },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    { id: 'glm-5.1', name: 'GLM-5.1' },
    { id: 'glm-5', name: 'GLM-5' },
    { id: 'kimi-k2.6', name: 'Kimi K2.6' },
    { id: 'kimi-k2.5', name: 'Kimi K2.5' },
    { id: 'qwen3.7-max', name: 'Qwen 3.7 Max' },
    { id: 'qwen3.6-plus', name: 'Qwen 3.6 Plus' },
    { id: 'minimax-m3', name: 'MiniMax M3' },
    { id: 'minimax-m2.7', name: 'MiniMax M2.7' },
    { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro' },
    { id: 'mimo-v2.5', name: 'MiMo V2.5' }
  ]
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [framework, setFramework] = useState('playwright_js');
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saveKeyLocal, setSaveKeyLocal] = useState(true);
  const [detectedProvider, setDetectedProvider] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [fileExtension, setFileExtension] = useState('js');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [copied, setCopied] = useState(false);

  // Detect provider from API key prefix
  const detectProviderFromKey = (key) => {
    if (!key) return null;
    const trimmed = key.trim();
    if (trimmed.startsWith('AIza')) return 'gemini';
    if (trimmed.startsWith('sk-ant-')) return 'anthropic';
    if (trimmed.startsWith('sk-or-')) return 'openrouter'; // must come before sk- check
    if (trimmed.startsWith('sk-')) return 'openai'; // ambiguous: OpenAI & OpenCode Go share this prefix
    return null;
  };

  // Auto-detect provider and model when API key is entered
  useEffect(() => {
    const detected = detectProviderFromKey(apiKey);
    setDetectedProvider(detected);

    if (detected) {
      // kunci: jika detected='openai' tapi user sudah pilih opencode,
      // jangan override (keduanya pakai prefix sk-)
      if (detected === 'openai' && provider === 'opencode') {
        // tetap set auto-detected badge tapi jangan ganti provider
        setIsAutoDetected(false);
        setDetectedProvider('opencode'); // visual hint: detected as code go
        return;
      }
      // kunci: jika detected='openai' tapi user sudah pilih openai, tetap di openai
      if (detected === 'openai' && provider === 'openai') {
        setIsAutoDetected(false);
        return;
      }
      setProvider(detected);
      setIsAutoDetected(true);
      setSelectedModel(''); // Clear manual model selection
      localStorage.setItem('webweave_provider', detected);
    } else {
      setIsAutoDetected(false);
    }
  }, [apiKey]);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('webweave_provider');
    if (savedProvider && AI_PROVIDERS[savedProvider]) {
      setProvider(savedProvider);
    }
    const savedModel = localStorage.getItem('webweave_model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Load API key whenever provider changes (but not when auto-detected)
  useEffect(() => {
    if (isAutoDetected) return; // Don't override auto-detected provider
    const savedKey = localStorage.getItem(`webweave_api_key_${provider}`);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey('');
    }
  }, [provider, isAutoDetected]);

  const currentProvider = AI_PROVIDERS[provider];

  const getActiveModel = () => {
    if (isAutoDetected || !selectedModel) {
      return AI_PROVIDERS[provider].defaultModel;
    }
    return selectedModel;
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setIsAutoDetected(false);
    setDetectedProvider(null);
    localStorage.setItem('webweave_provider', newProvider);
    setError('');
  };

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    setIsAutoDetected(false);
    localStorage.setItem('webweave_model', modelId);
  };

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

    // Save API key per provider if toggle is active
    if (saveKeyLocal && apiKey) {
      localStorage.setItem(`webweave_api_key_${provider}`, apiKey);
    } else if (!saveKeyLocal) {
      localStorage.removeItem(`webweave_api_key_${provider}`);
    }

    const activeModel = getActiveModel();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          prompt,
          framework,
          provider,
          apiKey: apiKey.trim() || undefined,
          modelId: activeModel
        }),
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

            {/* AI Provider Selector */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Zap size={16} />
                AI Provider
              </label>
              <div className={styles.providerGrid}>
                {Object.values(AI_PROVIDERS).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.providerCard} ${provider === p.id ? styles.providerCardActive : ''}`}
                    onClick={() => handleProviderChange(p.id)}
                    style={{ '--provider-color': p.color }}
                  >
                    <span className={styles.providerName}>{p.name}</span>
                    <span className={styles.providerDesc}>{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Key size={16} />
                {currentProvider.label} API Key
                <span className={styles.labelTextMuted}>(Optional if set in server env)</span>
              </label>
              <input
                type="password"
                className={styles.input}
                placeholder={currentProvider.placeholder}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className={styles.keyActions}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={saveKeyLocal}
                    onChange={(e) => setSaveKeyLocal(e.target.checked)}
                  />
                  Simpan API Key di browser ini
                </label>
                <a
                  href={currentProvider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.getKeyLink}
                >
                  Dapatkan API Key →
                </a>
              </div>
            </div>

            {/* Model Selector */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <ChevronDown size={16} />
                Model ({AI_PROVIDERS[provider].name})
                {provider === 'openrouter' && (
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.getKeyLink}
                  >
                    Browse all models →
                  </a>
                )}
              </label>
              {isAutoDetected ? (
                <div className={styles.autoDetectedInfo}>
                  <span className={styles.autoModelBadge}>Auto-detected:</span>
                  <span className={styles.autoModelName}>{AI_PROVIDERS[provider].defaultModel}</span>
                  <span className={styles.autoModelHint}>(Best model for {provider})</span>
                </div>
              ) : (
                <select
                  className={styles.select}
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  <option value="">-- Select Model --</option>
                  {PROVIDER_MODELS[provider].map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>

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
                  Pilih AI provider, masukkan URL, tujuan automasi, dan klik <strong>Generate Script</strong> untuk membuat skrip automasi Anda secara instan.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          Designed for developers and QA engineers. Supports Gemini, OpenAI, Claude & OpenRouter.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Note: Beberapa website yang memiliki proteksi bot sangat ketat (Cloudflare CAPTCHA) mungkin akan digenerasi menggunakan struktur DOM default.
        </p>
      </footer>
    </div>
  );
}
