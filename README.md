# WebWeave

AI-assisted web automation script generator for QA workflows.

WebWeave scans a target page with Playwright Chromium, extracts interactive DOM elements, highlights locator candidates, and generates automation scripts using a server-side AI provider.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.44-green)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What WebWeave Does

- Accepts a target URL, test objective, and automation framework.
- Normalizes domain-only URLs, for example `www.saucedemo.com` to `https://www.saucedemo.com`.
- Opens the target page using Playwright Chromium on the server.
- Extracts visible interactive elements: inputs, selects, buttons, links, roles, and test attributes.
- Captures a browser-style screenshot preview with highlighted locator candidates.
- Sends compact DOM context and the objective to a configured server-side AI provider.
- Returns generated automation code, ranked locator candidates, static quality checks, logs, provider info, and preview image to the UI.

## Key Features

- Server-side AI provider keys only; no API key input in the browser.
- Provider auto-detection from `.env.local`.
- Multi-framework generation: Playwright JavaScript, Playwright Python, Puppeteer JavaScript, Selenium Python, Cypress JavaScript.
- Locator-aware prompting with exact `id`, `name`, `data-test`, `data-testid`, and ARIA selector preference.
- Selector confidence scoring for top locator candidates.
- Static generated-code quality checks.
- Regeneration with feedback for improving generated output.
- Copy and download generated script output.
- Dark/light mode.
- Optional LemonSqueezy billing and monthly quota enforcement.

## Supported AI Providers

Configure at least one provider in `.env.local`.

| Priority | Provider | Default Model | Environment Variable |
|---:|---|---|---|
| 1 | OpenCode Go | `deepseek-v4-flash` | `OPENCODE_API_KEY` |
| 2 | OpenRouter | `google/gemini-2.0-flash-001` | `OPENROUTER_API_KEY` |
| 3 | Google Gemini | `gemini-2.0-flash` | `GEMINI_API_KEY` |
| 4 | OpenAI | `gpt-5.4` | `OPENAI_API_KEY` |
| 5 | Anthropic Claude | `claude-opus-4-8` | `ANTHROPIC_API_KEY` |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| UI | React 18, CSS Modules, Lucide React |
| Browser Automation | Playwright Chromium |
| AI SDKs | OpenAI SDK, Google Generative AI, Anthropic SDK |
| Runtime | Node.js 18+ |

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Playwright Chromium browser

### Install

```bash
npm install
npx playwright install chromium
```

### Configure Environment

Create `.env.local` from the example file:

```bash
cp .env.local.example .env.local
```

Fill at least one provider key:

```env
OPENCODE_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build

```bash
npm run build
```

## Usage Guidance

Use placeholders for credentials instead of real secrets.

Recommended prompt style:

```text
Login using {{USERNAME}} standard_user and {{PASSWORD}} secret_sauce.
Add all products to cart, open cart, checkout, fill form, continue, and finish order.
```

Do not submit real production passwords, tokens, customer data, or internal confidential information in prompts.

## API Behavior

Endpoint:

```text
POST /api/generate
```

Request body:

```json
{
  "url": "www.saucedemo.com",
  "prompt": "Login using {{USERNAME}} and {{PASSWORD}}, then complete checkout.",
  "framework": "playwright_python"
}
```

Successful response includes:

```json
{
  "success": true,
  "title": "Target Site",
  "code": "...",
  "fileExtension": "py",
  "logs": [],
  "provider": "opencode",
  "browserPreview": "data:image/jpeg;base64,...",
  "locatorSummary": [],
  "qualityChecks": []
}
```

## Security Guardrails

- `.env.local` is ignored by Git.
- AI provider keys stay server-side.
- `/api/debug` endpoint removed.
- Request body size limit.
- Prompt length limit.
- DOM context length limit.
- Basic per-client rate limit.
- URL normalization for domain-only input.
- URL validation allows only `http` and `https`.
- Embedded URL credentials are blocked.
- `localhost`, `.local`, private IPs, reserved IPs, and cloud metadata hosts are blocked.
- DNS is resolved before scraping; private/reserved resolved addresses are blocked.

### Optional LemonSqueezy Billing Setup

Billing can be implemented before LemonSqueezy validation is finished. Leave the LemonSqueezy variables blank during development; checkout buttons will show a safe configuration message instead of crashing.

1. Create/login to LemonSqueezy.
2. Enable Test Mode.
3. Create a store named `WebWeave`.
4. Create subscription products for `WebWeave Starter` and `WebWeave Pro`.
5. Create variants:
   - Starter Monthly: Rp49.000/month.
   - Starter Annual: around Rp470.000/year.
   - Pro Monthly: Rp129.000/month.
   - Pro Annual: around Rp1.238.000/year.
6. Copy store ID and variant IDs.
7. Create a LemonSqueezy API key.
8. For local webhook testing, run `ngrok http 3000`.
9. Set webhook callback URL to `https://<ngrok-id>.ngrok-free.app/api/billing/webhook` for local testing.
10. Use `https://<your-domain>/api/billing/webhook` for production.
11. Add webhook events: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`.
12. Copy the webhook signing secret into `LEMONSQUEEZY_WEBHOOK_SECRET`.
13. Fill `.env.local` and restart the Next.js dev server.

## License

MIT License.
