# WebWeave

> **AI-powered web automation script generator** — scrape DOM & generate production-ready Playwright/Puppeteer/Selenium/Cypress scripts from a URL + natural language prompt.

WebWeave scrapes the target site with Playwright headless, extracts all interactive DOM elements, and sends the context to an AI provider to generate complete automation scripts.

Supports **5 AI Providers**: Google Gemini, OpenAI, Anthropic Claude, OpenRouter (100+ models), and **OpenCode Go** (low-cost subscription).

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/) [![Playwright](https://img.shields.io/badge/Playwright-1.44-green)](https://playwright.dev/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

##  Fitur Utama

-  **5 AI Providers** — Gemini, OpenAI, Claude, OpenRouter (100+ model), **OpenCode Go** ($5/mo)
-  **DOM Scraping Otomatis** — Playwright headless extracts 69+ interactive elements from target site
-  **Multi-Framework** — Playwright (JS & Python), Puppeteer (JS), Selenium (Python), Cypress (JS)
-  **Copy & Download** — Generated code copy-to-clipboard or download as `.js`/`.py`/`.cy.js`
-  **Bring Your Own Key** — Input API Key in browser UI, stored per-provider in localStorage
-  **Fallback Mode** — If site has bot protection, WebWeave generates generic code from URL context
-  **Debug Endpoint** — `/api/debug` checks which environment API keys are loaded
-  **Modern UI** — Dark theme + glassmorphism design + provider color cards

---

## 🤖 AI Provider yang Didukung

| Provider | Model Default | Kelebihan | Harga |
|---|---|---|---|
| **OpenCode Go** | `deepseek-v4-flash` | 30rb+ req/5jam, tested models | $5 first month |
| **Google Gemini** | `gemini-2.0-flash` | Fast, free tier available | Gratis (limited) |
| **OpenAI** | `gpt-5.4` | Reliable, consistent output | Paid |
| **Anthropic Claude** | `claude-opus-4-8` | Best code quality | Paid |
| **OpenRouter** | `llama-4-maverick` | 100+ models, many free | Banyak gratis |

---

## 🖥️ Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| AI Providers | Gemini, OpenAI, Anthropic, OpenRouter, **OpenCode Go** |
| Scraping | [Playwright](https://playwright.dev/) (Headless Chromium) |
| UI Icons | [Lucide React](https://lucide.dev/) |
| Styling | CSS Modules + Glassmorphism |

---

## 🚀 Instalasi & Setup

### Prerequisites

Pastikan sudah terinstall di komputer kamu:

- **[Node.js](https://nodejs.org/)** versi 18 atau lebih baru
- **npm** (sudah otomatis terinstall bersama Node.js)

Cek versi:
```bash
node --version   # harus v18.x atau lebih baru
npm --version    # harus v9.x atau lebih baru
```

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/username/webweave.git
cd webweave
```

Atau jika sudah punya folder-nya, langsung masuk ke folder tersebut.

### Langkah 2 — Install Dependencies

```bash
npm install
```

Ini akan menginstall semua dependencies yang dibutuhkan:
- `next` — Framework web
- `react` & `react-dom` — UI library
- `playwright` — Browser automation untuk DOM scraping
- `@google/generative-ai` — Google Gemini SDK
- `openai` — OpenAI SDK (juga digunakan untuk OpenRouter)
- `@anthropic-ai/sdk` — Anthropic Claude SDK
- `lucide-react` — Icon library

### Langkah 3 — Install Playwright Browser

WebWeave membutuhkan Chromium browser untuk scraping. Install dengan:

```bash
npx playwright install chromium
```

> ⚠️ Jika skip langkah ini, scraping tetap akan fallback ke mode generic (tanpa DOM context).

### Langkah 4 — Konfigurasi API Key

Ada **2 cara** untuk mengkonfigurasi API Key:

#### Cara A: Via Environment File (Recommended untuk development)

```bash
# Copy file contoh
cp .env.local.example .env.local
```

Buka `.env.local` dan isi API Key untuk provider yang ingin digunakan:

```env
# Minimal isi satu provider
GEMINI_API_KEY=AIzaSy...          # Google AI Studio (free tier)
OPENAI_API_KEY=sk-...             # OpenAI Platform
ANTHROPIC_API_KEY=sk-ant-...      # Anthropic Console
OPENROUTER_API_KEY=sk-or-...      # OpenRouter (100+ models)
OPENCODE_API_KEY=...              # OpenCode Go ($5/mo, recommended)
```

#### Cara B: Via Browser UI

Tidak perlu konfigurasi file apapun — langsung input API Key di halaman web saat menggunakan aplikasi.

### Langkah 5 — Jalankan Aplikasi

```bash
npm run dev
```

Buka browser dan akses:

```
http://localhost:3000
```

🎉 **WebWeave siap digunakan!**

---

## 📖 Cara Mendapatkan API Key

### OpenCode Go (Recommended — $5/mo, 30K+ requests)

1. Buka [OpenCode Zen](https://opencode.ai/auth)
2. Login / buat akun
3. Subscribe ke **Go** ($5 first month, then $10/mo)
4. Copy API Key dari console
5. Tambahkan ke `.env.local`: `OPENCODE_API_KEY=your-key`

> ✅ **Recommended** — 30,000+ requests per 5 hours with DeepSeek V4 Flash. Models: Kimi K2.6, Qwen 3.7 Max, DeepSeek V4 Pro, MiMo V2.5, GLM-5.1, MiniMax M3.

---

## 📖 Cara Mendapatkan API Key

### OpenCode Go (Recommended — $5/mo, 30K+ requests)

1. Buka [OpenCode Zen](https://opencode.ai/auth)
2. Login / buat akun
3. Subscribe ke **Go** ($5 first month, then $10/mo)
4. Copy API Key dari console
5. Tambahkan ke `.env.local`: `OPENCODE_API_KEY=your-key`

> ✅ **Recommended** — 30,000+ requests per 5 hours with DeepSeek V4 Flash. Models: Kimi K2.6, Qwen 3.7 Max, DeepSeek V4 Pro, MiMo V2.5, GLM-5.1, MiniMax M3.

### Google Gemini (Gratis)

1. Buka [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Login dengan akun Google
3. Klik **"Create API Key"**
4. Copy API Key yang dihasilkan (format: `AIzaSy...`)

> ✅ **Free tier** tersedia — cocok untuk testing dan penggunaan ringan.

### OpenAI

1. Buka [OpenAI Platform](https://platform.openai.com/api-keys)
2. Login atau buat akun
3. Klik **"Create new secret key"**
4. Copy API Key (format: `sk-...`)

> 💰 Membutuhkan credit balance. GPT-4o Mini sangat terjangkau (~$0.15/1M input tokens).

### Anthropic Claude

1. Buka [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Login atau buat akun
3. Klik **"Create Key"**
4. Copy API Key (format: `sk-ant-...`)

> 💰 Membutuhkan credit. Claude menghasilkan kode berkualitas tinggi.

### OpenRouter (Banyak Model Gratis)

1. Buka [OpenRouter](https://openrouter.ai/keys)
2. Login dengan Google/GitHub
3. Klik **"Create Key"**
4. Copy API Key (format: `sk-or-...`)

> ✅ Banyak **model gratis** tersedia: Gemini 2.0 Flash, DeepSeek V3, Llama 4, Mistral Small, dll.

---

## 📖 Tutorial Penggunaan

### Step 1 — Pilih AI Provider

Di halaman utama, pilih AI provider yang ingin digunakan dari grid provider cards:

- **Gemini** — Default, ada free tier
- **OpenAI** — Reliable & versatile
- **Claude** — Kualitas kode terbaik
- **OpenRouter** — Akses ke 100+ model (banyak gratis)

### Step 2 — Masukkan API Key

Isi API Key sesuai provider yang dipilih. Centang **"Simpan API Key di browser ini"** agar tidak perlu input ulang setiap kali.

> 💡 Klik link **"Dapatkan API Key →"** untuk langsung menuju halaman pembuatan API Key.

### Step 3 — Pilih Model (Khusus OpenRouter)

Jika menggunakan OpenRouter, pilih model yang diinginkan dari dropdown:

| Model | Keterangan |
|---|---|
| Gemini 2.0 Flash | Gratis, cepat |
| DeepSeek V3 | Gratis, kualitas baik |
| Llama 4 Maverick | Gratis, dari Meta |
| Mistral Small 3.1 | Gratis, efisien |
| Claude Sonnet 4 | Berbayar, kualitas premium |
| GPT-4o Mini | Berbayar, reliable |

### Step 4 — Masukkan Target URL

Isi URL website yang ingin dibuatkan skrip automasinya:

```
https://saucedemo.com
https://github.com/login
https://yourapp.com/login
https://hris-staging.kantorku.id/
```

### Step 5 — Tulis Automation Objective

Jelaskan dalam bahasa natural **apa yang ingin diotomasi**. Semakin detail deskripsinya, semakin baik hasilnya.

**Contoh sederhana:**
```
Login dengan username 'standard_user' dan password 'secret_sauce'
```

**Contoh detail (recommended):**
```
Login menggunakan username 'standard_user' dan password 'secret_sauce',
kemudian verifikasi halaman produk muncul dengan judul 'Products',
lalu tambahkan item pertama ke cart dan verifikasi badge cart menampilkan '1'.
```

**Contoh lain:**
```
Isi form registrasi dengan nama 'John Doe', email 'john@test.com',
password 'Test1234!', konfirmasi password 'Test1234!',
centang checkbox terms & conditions, klik tombol Register,
dan verifikasi halaman sukses muncul.
```

### Step 6 — Pilih Framework

Pilih framework automation target:

| Framework | Bahasa | File Output | Cocok Untuk |
|---|---|---|---|
| **Playwright JS** | JavaScript | `.js` | Modern web testing, Node.js |
| **Playwright Python** | Python | `.py` | Python developers |
| **Puppeteer JS** | JavaScript | `.js` | Chrome automation |
| **Selenium Python** | Python | `.py` | QA engineer klasik |
| **Cypress JS** | JavaScript | `.cy.js` | Frontend dev testing |

### Step 7 — Generate!

Klik tombol **"Generate Script"**. WebWeave akan:

1. 🌐 Membuka website target di browser headless (Playwright Chromium)
2. 🔍 Mengekstrak semua elemen interaktif (input, button, link, form, dll)
3. 🤖 Mengirim data DOM + prompt kamu ke AI provider yang dipilih
4. 📝 Menghasilkan skrip automasi lengkap dalam beberapa detik

### Step 8 — Copy atau Download

Setelah kode dihasilkan di panel kanan:

- Klik **Copy** untuk copy ke clipboard
- Klik **Download** untuk download sebagai file (`.js`, `.py`, atau `.cy.js`)

---

## ⚙️ Cara Kerja (Under the Hood)

```
User Input (Provider + URL + Prompt + Framework)
        │
        ▼
┌───────────────────────────┐
│   Phase 1: DOM Scraping   │  ← Playwright headless Chromium
│   • Extract all inputs,   │    extracts 69-150 interactive
│     buttons, links, forms │    elements from target page
│   • Capture headings,     │
│     labels, roles, aria   │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│   Phase 2: AI Generation  │  ← Routes to selected provider:
│   ┌─────────────────────┐ │    Gemini / OpenAI / Claude
│   │ 5 AI Providers:     │ │    / OpenRouter / OpenCode Go
│   │ Gemini / OpenAI /   │ │
│   │ Claude / OpenRouter │ │    Receives DOM context +
│   │ / OpenCode Go       │ │    system prompt + user goal
│   └─────────────────────┘ │
└───────────────────────────┘
        │
        ▼
   Phase 3: Extract code block → Return as runnable script ✅
```

---

## 📁 Struktur Proyek

```
webweave/
├── src/
│   └── app/
│       ├── page.js              # Main UI — provider selector, form, code viewer
│       ├── page.module.css      # Styling — glassmorphism, provider cards
│       ├── layout.js            # Root layout Next.js
│       ├── globals.css          # Global CSS, design tokens, fonts
│       └── api/
│           ├── generate/
│           │   └── route.js     # API Route — DOM scraping + multi-provider AI
│           └── debug/
│               └── route.js     # Debug endpoint — check loaded env keys
├── scripts/
│   └── hris_login_menu.js       # Example: working standalone Playwright script
├── Hasil generate/
│   └── hris-staging_automation.js  # Example: AI-generated script output
├── .env.local                   # API Keys (not committed to git)
├── .env.local.example           # Example env configuration
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies & scripts
└── README.md                    # This documentation
```

---

## 🔒 Keamanan

- API Key yang disimpan di browser menggunakan **localStorage** — hanya tersimpan di perangkat kamu
- Setiap provider menyimpan key **terpisah** (`webweave_api_key_gemini`, `webweave_api_key_openai`, dll)
- WebWeave **tidak pernah mengirim** API Key ke server pihak ketiga selain provider yang dipilih
- File `.env.local` otomatis diabaikan oleh git (ada di `.gitignore`)
- Disarankan menggunakan API Key dengan **limit kuota** untuk keamanan tambahan

---

## ⚠️ Keterbatasan

| Keterbatasan | Detail |
|---|---|
| **Bot Protection** | Website dengan Cloudflare CAPTCHA, reCAPTCHA, atau anti-bot ketat tidak bisa di-scrape DOM-nya — WebWeave fallback ke mode generic |
| **Token Limit** | Maksimal 150 elemen interaktif yang dianalisis per halaman |
| **Review Required** | Kode yang dihasilkan adalah titik awal yang baik, namun tetap perlu di-review dan disesuaikan |
| **Dynamic Content** | SPA (Single Page App) yang heavy mungkin belum sepenuhnya ter-render saat scraping |
| **API Quota** | Setiap provider memiliki limit — jika terkena rate limit, tunggu beberapa saat atau gunakan provider lain |

---

## 🛠️ NPM Scripts

```bash
npm run dev      # Jalankan development server (http://localhost:3000)
npm run build    # Build production bundle
npm run start    # Jalankan production server
npm run lint     # Linting dengan ESLint
```

---

## 🔧 Troubleshooting

### Error: "API Key tidak ditemukan"
- Pastikan API Key sudah diisi di form browser **atau** di file `.env.local`
- Pastikan provider yang dipilih sesuai dengan API Key yang dimasukkan

### Error: "Rate limit / quota exceeded"
- Tunggu beberapa menit lalu coba lagi
- Gunakan provider lain (misalnya switch dari Gemini ke OpenRouter)
- Upgrade plan API kamu

### Error: "Scraping failed"
- Website target mungkin memiliki proteksi bot — WebWeave akan tetap generate kode secara generic
- Pastikan koneksi internet stabil
- Pastikan Playwright Chromium sudah terinstall: `npx playwright install chromium`

### Port 3000 sudah dipakai
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Atau jalankan di port lain
npx next dev -p 3001
```

---

## ✅ Tested & Verified

| Test Case | Status | Details |
|---|---|---|
| DOM Scraping (HRIS KantorKu) | ✅ Passed | 69 interactive elements extracted |
| Login Flow (HRIS) | ✅ Passed | risa.stagingtest@gmail.com / stgtest123! |
| Select Company + Dashboard | ✅ Passed | Click Continue to Dashboard → `/home` |
| Menu Extraction | ✅ Passed | 46 menu items found (Employee, Payroll, Leave, etc.) |
| API Endpoint `/api/generate` | ✅ Passed | Returns proper error/success responses |
| Debug Endpoint `/api/debug` | ✅ Passed | Shows loaded environment keys |
| Error Handling | ✅ Passed | 400/401/403/429/500 properly categorized |
| Gen Script (manual) | ✅ Passed | `scripts/hris_login_menu.js` runs successfully |
| Gen Script (AI - free model) | ⚠️ Partial | Uses `@playwright/test`, generic selectors |

---

## 📝 Changelog

### v0.2.0 (Jun 2026)
- ➕ Added **OpenCode Go** as 5th AI provider (DeepSeek V4, Qwen 3.7, Kimi K2.6, GLM-5.1 + 9 more)
- 🔧 Fixed Gemini default model: `gemini-3.0-flash` → `gemini-2.0-flash` (old model 404)
- 🐛 Fixed OpenRouter model list: removed non-existent `gemini-3.x` entries
- ➕ Added `/api/debug` endpoint to verify loaded API keys
- 📄 Added `scripts/hris_login_menu.js` — working standalone Playwright example
- 📄 Added `Hasil generate/` — sample AI-generated output directory
- 🧪 Verified full flow: DOM scrape → login → dashboard → menu extraction

### v0.1.0 (Initial)
- Next.js 14 App Router + Playwright headless
- 4 AI providers: Gemini, OpenAI, Claude, OpenRouter
- 5 automation frameworks
- Glassmorphism UI + provider color cards
- localStorage API key management

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.

---

<p align="center">
  Built with ❤️ using Next.js, Playwright, and Multi-Provider AI<br/>
  <sub>Supports Gemini • OpenAI • Claude • OpenRouter</sub>
</p>
