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

## Pricing and Quota

WebWeave uses monthly generation quotas. One successful `/api/generate` response consumes one generation. Failed validation, blocked URLs, unsupported frameworks, browser failures, AI failures, and safety-gate failures do not consume quota.

| Plan | Monthly price | Generations/month | Projects | Frameworks |
| --- | ---: | ---: | ---: | --- |
| Free | Rp0 | 5 | 1 | Playwright JavaScript |
| Starter | Rp49.000 | 75 | 5 | Playwright JS/Python, Selenium Python, Cypress JS |
| Pro | Rp129.000 | 300 | 25 | All supported frameworks |
| Team | Rp299.000 | 1.000 | Coming soon | All supported frameworks |

Midtrans is the active checkout provider. Team checkout and LemonSqueezy billing are disabled in the current product.

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

### LemonSqueezy Billing Status

LemonSqueezy code is kept for future reactivation, but it is disabled for now. Current checkout uses Midtrans only. `POST /api/billing/webhook` returns a disabled response and does not process LemonSqueezy events.

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

### Midtrans Sandbox Billing Setup (Current Default)

Midtrans Snap is the default sandbox checkout. Use Midtrans sandbox keys first.

1. Create or log in to your Midtrans sandbox account.
2. Copy the sandbox Server Key into `MIDTRANS_SERVER_KEY`.
3. Copy the sandbox Client Key into `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.
4. Keep `MIDTRANS_IS_PRODUCTION=false` for sandbox.
5. Apply `supabase/migrations/003_midtrans_billing_profiles.sql` and `supabase/migrations/004_midtrans_billing_orders.sql` in Supabase.
6. Expose local webhook with `ngrok http 3000`.
7. Set the Midtrans Payment Notification URL to `https://<ngrok-id>.ngrok-free.app/api/billing/midtrans/webhook`.
8. Click Starter or Pro from the pricing modal and use Midtrans sandbox payment credentials.
9. Successful `settlement` or accepted `capture` notifications automatically upgrade the user profile until `billing_period_ends_at`.

Webhook entitlement uses trusted `billing_orders` records created by the checkout route. Non-terminal Midtrans statuses do not downgrade active plans, and repeated settlement notifications keep the original period end.

## License

MIT License.
