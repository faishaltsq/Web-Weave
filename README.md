# 🕸️ WebWeave

> **AI-powered web automation script generator** — scrape DOM & generate production-ready Playwright/Puppeteer/Selenium/Cypress scripts from a URL + natural language prompt.

WebWeave scrapes the target site with Playwright headless, extracts all interactive DOM elements, and sends the context to an AI provider to generate complete automation scripts.

**Server-side AI** — provider & API keys configured via `.env.local` only. No API key input in UI. Auto-detects provider from configured keys.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/) [![Playwright](https://img.shields.io/badge/Playwright-1.44-green)](https://playwright.dev/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🤖 **Server-Side AI** — Provider auto-detected from `.env.local`. No API key UI — clean SaaS-ready
- 🌐 **DOM Scraping** — Playwright headless extracts 69+ interactive elements with key element highlighting
- 🧰 **Multi-Framework** — Playwright (JS & Python), Puppeteer (JS), Selenium (Python), Cypress (JS)
- 📋 **Copy & Download** — Generated code copy-to-clipboard or download as `.js`/`.py`/`.cy.js`
- ⚡ **Smart Prompts** — AI instructed: use exact DOM ids, retry navigation, avoid `networkidle`
- 🔄 **Auto-Detect Provider** — Priority: OpenCode Go > OpenRouter > Gemini > OpenAI > Claude
- 🐚 **Debug Endpoint** — `/api/debug` checks which environment API keys are loaded
- 🎨 **Modern UI** — Dark theme + glassmorphism design

---

## 🤖 Supported AI Providers

| Provider | Default Model | Priority | Cost |
|---|---|---|---|
| **OpenCode Go** | `deepseek-v4-flash` | 1st (default) | $5 first month |
| **OpenRouter** | `google/gemini-2.0-flash-001` | 2nd | Many free |
| **Google Gemini** | `gemini-2.0-flash` | 3rd | Free tier |
| **OpenAI** | `gpt-5.4` | 4th | Paid |
| **Anthropic Claude** | `claude-opus-4-8` | 5th | Paid |

Configure any one provider in `.env.local`. Server auto-detects the first available.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| AI Providers | OpenCode Go, OpenRouter, Gemini, OpenAI, Claude |
| Scraping | [Playwright](https://playwright.dev/) (Headless Chromium) |
| UI Icons | [Lucide React](https://lucide.dev/) |
| Styling | CSS Modules + Glassmorphism |

---

## 🚀 Installation & Setup

### Prerequisites

- **[Node.js](https://nodejs.org/)** v18+
- **npm** v9+

```bash
node --version   # must be v18.x+
npm --version    # must be v9.x+
```

### Step 1 — Clone & Install

```bash
git clone https://github.com/faishaltsq/Web-Weave.git
cd Web-Weave
npm install
```

### Step 2 — Install Playwright Browser

```bash
npx playwright install chromium
```

### Step 3 — Configure API Key (`.env.local`)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` — fill **at least one** API key:

```env
# Recommended: OpenCode Go ($5/month) — https://opencode.ai/auth
OPENCODE_API_KEY=sk-...

# Or use free alternatives:
GEMINI_API_KEY=AIzaSy...          # Google AI Studio (free tier)
OPENROUTER_API_KEY=sk-or-...      # OpenRouter (many free models)
OPENAI_API_KEY=sk-...             # OpenAI
ANTHROPIC_API_KEY=sk-ant-...      # Anthropic Claude
```

**Provider auto-detection priority:** OpenCode Go → OpenRouter → Gemini → OpenAI → Claude

### Step 4 — Run

```bash
npm run dev
```

Open `http://localhost:3000`

---

## 📖 Usage

### Simple: 3 inputs only

1. **Target URL** — The website to automate
2. **Automation Objective** — What to do (natural language)
3. **Framework** — Pick your target framework

Click **Generate Script**. That's it.

### Example

```
URL: https://hris-staging.kantorku.id/
Prompt: Login with email risa.stagingtest@gmail.com and password stgtest123!,
        then show the main menu items
Framework: Playwright (JavaScript)
```

---

## 📖 Getting API Keys

### OpenCode Go (Recommended — $5/mo)

1. Go to [OpenCode Zen](https://opencode.ai/auth)
2. Login / create account
3. Subscribe to **Go** ($5 first month, then $10/mo)
4. Copy API Key from console
5. Add to `.env.local`: `OPENCODE_API_KEY=your-key`

> 30,000+ requests per 5 hours with DeepSeek V4 Flash. Models: Kimi K2.6, Qwen 3.7 Max, DeepSeek V4 Pro, MiMo V2.5, GLM-5.1, MiniMax M3.

### Google Gemini (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Login with Google account
3. Click **"Create API Key"**
4. Copy key (format: `AIzaSy...`)

> Free tier available — suitable for testing and light usage.

### OpenRouter (Many Free Models)

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Login with Google/GitHub
3. Click **"Create Key"**
4. Copy key (format: `sk-or-...`)

> Many free models: Gemini 2.0 Flash, DeepSeek V3, Llama 4, Mistral.

---

## ⚙️ How It Works

```
User Input (URL + Prompt + Framework)
        │
        ▼
┌───────────────────────────┐
│   Phase 1: DOM Scraping   │  ← Playwright headless Chromium
│   • Extract all inputs,   │    extracts 69-150 interactive
│     buttons, links, forms │    elements from target page
│   • Highlight KEY elements│    (ids, submit buttons, forms)
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│   Phase 2: AI Generation  │  ← Auto-detect provider from env
│   • Smart prompt: use     │    keys (OpenCode Go priority)
│     exact DOM ids first   │
│   • Navigation retries    │    Receives DOM context +
│   • No networkidle        │    system prompt + user goal
│   • Standalone scripts    │
└───────────────────────────┘
        │
        ▼
   Phase 3: Extract code block → Return runnable script ✅
```

---

## 📁 Project Structure

```
webweave/
├── src/
│   └── app/
│       ├── page.js              # Main UI — URL, prompt, framework inputs
│       ├── page.module.css      # Styling — glassmorphism
│       ├── layout.js            # Root layout
│       ├── globals.css          # Global CSS, design tokens
│       └── api/
│           ├── generate/
│           │   └── route.js     # API Route — DOM scraping + auto-detect AI
│           └── debug/
│               └── route.js     # Debug endpoint — check loaded env keys
├── scripts/
│   └── hris_login_menu.js       # Example: verified working Playwright script
├── Hasil generate/
│   └── hris-staging_automation.py  # Example: AI-generated script output
├── .env.local                   # API Keys (not committed)
├── .env.local.example           # Example env configuration
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies & scripts
└── README.md                    # This documentation
```

---

## 🔒 Security

- API Keys stored **server-side only** in `.env.local`
- No API keys exposed to browser — no localStorage, no client-side storage
- `.env.local` is gitignored — never committed
- Recommended to use API keys with quota limits

---

## NPM Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint linting
```

---

## 🔧 Troubleshooting

| Error | Solution |
|---|---|
| "No AI provider configured" | Fill at least one API key in `.env.local` |
| "Rate limit / quota exceeded" | Wait a few minutes, or add another provider key |
| "Scraping failed" | Site may have bot protection — install Chromium: `npx playwright install chromium` |
| Port 3000 in use | `netstat -ano \| findstr :3000` → `taskkill /PID <PID> /F` |

---

## ✅ Verified

| Test | Status | Details |
|---|---|---|
| DOM Scraping (HRIS KantorKu) | ✅ | 69 elements extracted, key elements highlighted |
| Login Flow (HRIS) | ✅ | risa.stagingtest@gmail.com / stgtest123! |
| Select Company → Dashboard | ✅ | Click Continue to Dashboard → `/home` |
| Menu Extraction | ✅ | 46 menu items (Employee, Payroll, Leave, etc.) |
| API Endpoint `/api/generate` | ✅ | Proper error/success responses |
| Debug Endpoint `/api/debug` | ✅ | Shows loaded environment keys |
| Manual Script | ✅ | `scripts/hris_login_menu.js` runs successfully |

---

## 📝 Changelog

### v0.3.0 (Jun 2026)
- 🔥 **Removed API key UI** — all provider selection & key input removed from frontend
- 🔄 **Auto-detect provider** from `.env.local` keys (OpenCode Go priority)
- 🧠 **Improved prompt engineering** — AI now uses exact DOM ids, retry navigation, standalone scripts
- 📋 **Key elements extraction** — highlight important DOM elements for better AI context
- 🛑 **No more `networkidle`** — replaced with `domcontentloaded` + explicit waits
- 📄 Reduced page.js by 200+ lines (removed provider config, model lists, auto-detect logic)

### v0.2.0 (Jun 2026)
- ➕ Added **OpenCode Go** as 5th AI provider
- 🔧 Fixed Gemini default model: `gemini-3.0-flash` → `gemini-2.0-flash`
- 🐛 Fixed OpenRouter model list
- ➕ Added `/api/debug` endpoint

### v0.1.0 (Initial)
- Next.js 14 + Playwright headless
- 4 AI providers, 5 frameworks
- Glassmorphism UI

---

## 📄 License

MIT License — free to use and modify.

---

<p align="center">
  Built with Next.js, Playwright, and server-side AI<br/>
  <sub>OpenCode Go • OpenRouter • Gemini • OpenAI • Claude</sub>
</p>
