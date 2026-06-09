# WebWeave

AI-assisted web automation script generator for QA workflows.

WebWeave scans a target page with Playwright Chromium, extracts interactive DOM elements, highlights locator candidates, and generates automation scripts using a server-side AI provider. It is currently positioned as a local/private-beta QA assistant, not a public SaaS-ready product yet.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.44-green)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Current Status

| Area | Status | Notes |
|---|---:|---|
| V1 Safety MVP | Complete | URL validation, SSRF guardrails, request limits, rate limiting, debug route removed |
| Locator Preview UI | Complete | Chromium screenshot is returned to UI with highlighted locator candidates |
| V2 Reliable Generation | Complete for local beta | Selector confidence scoring, locator candidate list, static checks, code extraction fixes, and cross-framework reliability rules added |
| Cross-framework validation | Partially verified | Playwright JS, Playwright Python, and patched Puppeteer completed OrangeHRM add-employee flow; Selenium and Cypress exposed remaining hardening gaps |
| V3 UI/UX Polish | Complete | v0-style initial prompt screen, split workspace after generation, headless runner loading state, button animations, and right-panel section scrolling |
| Branding Polish | Complete | Custom circular WebWeave logo is used in the UI and browser tab favicon through `/logo` |
| Backend/Data Layer | MVP scaffold implemented | Supabase Auth client, projects API, generated script history API, SQL schema/RLS migration, and save-to-history UI added; requires Supabase env + migration |
| Public SaaS Readiness | Not ready | Needs auth, quotas, stronger browser isolation, policies, and billing guardrails |

Current project position: WebWeave is past the initial prototype and is now a local/private-beta generator with safety controls, locator preview, static quality checks, real cross-framework test evidence, and a Supabase persistence scaffold. The next product-level step is configuring a Supabase project, running the SQL migration, then testing auth, projects, and generated script history end-to-end. Sandboxed run-and-fix validation should come after that foundation, not before public launch.

## Execution Progress V1-V6

This V1-V6 list describes work already completed during the current build cycle. It is separate from the long-term product roadmap where public SaaS release is still future work.

| Execution Step | Status | Result |
|---|---:|---|
| V1 - Safety baseline | Complete | Removed unsafe debug route, blocked private/internal targets, added request limits and rate limit, removed credential-bearing examples |
| V2 - Browser-lab UI and locator preview | Complete | Added Chromium screenshot preview, highlighted interactive elements, ranked locator candidates, solid vibrant UI, dark/light mode |
| V3 - Reliable generation contract | Complete | Added strict prompt rules for locator helpers, fallback candidates, dynamic-list handling, no `networkidle`, no optional generated IDs unless requested |
| V4 - Static checks and extraction hardening | Complete | Added `qualityChecks`, markdown fence stripping, truncated-output heuristics, framework selector/API checks, ASCII output warning, increased output budget |
| V5 - Real target framework validation | Complete with findings | Generated and ran OrangeHRM add-employee flow for Playwright JS, Playwright Python, Puppeteer, Selenium, and Cypress; fixed multiple generator issues from failures |
| V6 - Documentation and visual roadmap | Complete in this update | README and Excalidraw now show project journey, current status, completed process, and remaining gaps clearly |
| V7 - v0-style UI/UX polish | Complete | Initial page now behaves like a prompt-first AI builder; generated mode has separate left prompt/log section and right preview/code section with independent scroll |
| V8 - Supabase backend/data layer | MVP scaffold implemented | Added Supabase env template, browser/server clients, Auth UI, project/script APIs, SQL schema/RLS migration, and auto-save history after generation |

## Backend and Database Plan

WebWeave currently works as a local/private-beta generator without persistent user data. To support accounts, saved projects, script history, run history, templates, quotas, and artifacts, the next foundation should be a backend/data layer.

Recommended stack for cheapest maintenance and good scalability:

| Layer | Recommendation | Reason |
|---|---|---|
| Auth | Supabase Auth | Built-in email/password, magic link, OAuth, session handling |
| Database | Supabase Postgres | Standard SQL, relational data model, portable, scalable enough for private beta and paid beta |
| File Storage | Supabase Storage | Store screenshots, run artifacts, generated files, and future videos |
| Backend | Next.js Route Handlers | Already in the app; no separate backend service needed for MVP |
| ORM | Drizzle preferred, Prisma acceptable | Drizzle is lightweight for serverless; Prisma is familiar but heavier |
| Hosting | Vercel for web app | Simple deployment for Next.js |
| Runner | Separate worker later | Do not run arbitrary generated scripts on the main web server |

### Why Supabase First

- Cheap/free-tier friendly for private beta.
- Low maintenance because Auth, Postgres, and Storage are one platform.
- PostgreSQL is better than document-only databases for project ownership, run history, quotas, billing status, and team/workspace relationships.
- Row Level Security can enforce `owner_id = auth.uid()` so users can only read/write their own data.
- Storage can keep screenshots and run evidence without bloating the database.
- It can scale from local/private beta into paid beta before needing custom infrastructure.

### Proposed Data Model

Initial tables:

| Table | Purpose | Key Fields |
|---|---|---|
| `profiles` | Extra user profile and plan data | `id`, `email`, `full_name`, `plan`, `monthly_generation_limit` |
| `projects` | Saved automation projects | `id`, `owner_id`, `name`, `target_domain`, `description`, `created_at`, `updated_at` |
| `generated_scripts` | Code generation history | `id`, `project_id`, `owner_id`, `framework`, `prompt`, `target_url`, `code`, `quality_gate`, `quality_checks`, `locator_summary` |
| `templates` | Reusable prompt templates | `id`, `owner_id`, `name`, `prompt`, `framework`, `visibility` |
| `usage_events` | Quota and cost tracking | `id`, `owner_id`, `event_type`, `quantity`, `metadata`, `created_at` |
| `artifacts` | Screenshots, generated files, logs | `id`, `owner_id`, `project_id`, `run_id`, `type`, `storage_path`, `mime_type`, `size_bytes` |
| `runs` | Future script execution history | `id`, `script_id`, `project_id`, `owner_id`, `status`, `logs`, `error_message`, `screenshot_url`, `duration_ms` |

Recommended implementation order:

1. Add Supabase project and environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Add Supabase Auth and protect the generator page.
3. Create `profiles`, `projects`, `generated_scripts`, and `usage_events` first.
4. Save every successful generated script into `generated_scripts` under a selected project.
5. Add project sidebar/history view so users can reopen previous scripts.
6. Add quota checks using `usage_events` before calling AI providers.
7. Add Supabase Storage bucket `artifacts` for screenshots and future run evidence.
8. Add `templates` after script history works.
9. Add `runs` only when sandboxed script execution is implemented.

Security requirements for this phase:

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Enable Row Level Security on all user-owned tables.
- Use `owner_id = auth.uid()` policies for user-owned data.
- Do not store real user passwords, tokens, or provider secrets in prompts/logs.
- Store preview screenshots and artifacts with user-scoped paths.
- Do not run generated code in the main Next.js runtime; use a separate sandbox/worker later.

Implemented in this scaffold:

- Supabase browser client for email/password auth.
- Server service-role client used only inside route handlers.
- `/api/projects` for user-owned project list/create.
- `/api/generated-scripts` for user-owned saved script list/create.
- SQL migration at `supabase/migrations/001_initial_schema.sql` with tables, indexes, triggers, and RLS policies.
- Sidebar auth card and saved script history.
- Project selector in the generator.
- Automatic save to `generated_scripts` after successful generation when user is signed in.

Recommended next deliverable:

- “Authenticated private beta”: users can log in, create projects, generate scripts, save script history, and view usage count. No billing and no script runner yet.

Setup steps:

1. Create Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor.
3. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Restart `npm run dev`.
5. Sign up/sign in from WebWeave sidebar.
6. Generate script and confirm it appears under saved scripts.

## Latest UI/UX Progress

Completed after the framework validation pass:

- Reworked the initial screen to match the v0-style UX reference: sidebar on the left, large centered prompt composer, URL input, framework selector, and Generate button.
- Reworked the post-generate workspace into a split layout: prompt/log/regenerate panel on the left and browser preview plus generated code on the right.
- Replaced generic scanning animation with a headless Playwright runner state showing `headless: true`, command execution, DOM extraction steps, locator ranking, and AI prompt handoff.
- Added smooth appear animations when switching from prompt mode to generated workspace mode.
- Added hover/click micro-interactions for buttons, nav items, theme toggle, copy/download, and regenerate actions.
- Fixed scrolling behavior so the right preview/code section scrolls independently like the prompt section, instead of scrolling only the code block or the whole page.
- Added the custom WebWeave logo to the sidebar, hero prompt screen, and browser tab favicon.
- Served the logo through `/logo` with a circular SVG clip so it appears round instead of square.
- Added a quality gate badge for generated output: `pass`, `warn`, or `fail`.
- Updated script download filenames to follow the selected framework, for example `playwright-js_automation.js`.
- Removed the Cypress artifact folder from the WebWeave project after Cypress validation testing.

## Validation Evidence

Target used for framework validation:

```text
https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
```

Prompt used:

```text
login menggunakan Admin dan password admin123 kemudian tambahkan orang di menu PIM dan isi form kemudian save dan isi sampai selesai
```

Framework results from the latest validation cycle:

| Framework | Result | Notes |
|---|---:|---|
| Playwright JavaScript | Passed | Login, PIM, Add Employee, Save, and `viewPersonalDetails` confirmation completed |
| Playwright Python | Passed | Login, PIM, Add Employee, Save, and `viewPersonalDetails` confirmation completed after selector-order fixes |
| Puppeteer JavaScript | Passed after local script patch | Needed `headless: 'shell'` and replacement for removed `page.waitForTimeout()` in Puppeteer 25; generator guidance patched |
| Selenium Python | Partial | Login, PIM, Add button, form fill, and save signal worked; generated script still over-verified a `Personal Details` heading and failed after success |
| Cypress JavaScript | Failed | Cypress ran headless, but generated helper had a candidate recursion/timing bug before username fill |

Important issues found and addressed in generator guidance:

- Playwright Python must not call `locator.count()` before waiting on slow pages.
- Playwright Python must use `locator.first` property, not `locator.first()`.
- Generated code must avoid non-ASCII logs on Windows Python console.
- Puppeteer must not use Playwright-only `:has-text()` selectors.
- Puppeteer 25 does not support `page.waitForTimeout()`.
- Local Puppeteer Chrome needed `headless: 'shell'` to avoid `Network.enable timed out`.
- OrangeHRM PIM Add button must be scoped to `.orangehrm-header-container`; bare `.oxd-button--secondary` can click wrong search-form buttons.
- Selenium locator tuples must use `By.NAME`, `By.CSS_SELECTOR`, and `By.XPATH`, not raw string locators.
- Selenium click interception needs normal retry after overlays/spinners before JavaScript click.
- Cypress helpers must preserve candidate arrays and wait for DOM readiness instead of exhausting candidates too early.

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
- Multi-framework generation:
  - Playwright JavaScript
  - Playwright Python
  - Puppeteer JavaScript
  - Selenium Python
  - Cypress JavaScript
- Locator-aware prompting with exact `id`, `name`, `data-test`, `data-testid`, and ARIA selector preference.
- Selector confidence scoring for top locator candidates.
- Locator candidate list in the UI after DOM scan.
- Static generated-code checks for common quality issues.
- Robust markdown-fence extraction for generated code blocks.
- Regeneration with feedback for improving generated output.
- Mandatory locator validation rules in generated scripts.
- Cross-framework locator helper contract for Playwright, Puppeteer, Selenium, and Cypress.
- Dynamic-list action rules, for example repeatedly clicking current `Add to cart` buttons until none remain.
- Copy and download generated script output.
- Vibrant solid-color browser-lab UI with dark/light mode.

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

## Project Structure

```text
webweave/
├── src/
│   └── app/
│       ├── api/
│       │   └── generate/
│       │       └── route.js        # DOM scan, safety validation, AI generation
│       ├── globals.css             # Global CSS variables and base styles
│       ├── layout.js               # App metadata and root layout
│       ├── page.js                 # Main UI and generation workflow
│       └── page.module.css         # Solid vibrant browser-lab styling
├── .env.local.example              # Environment variable template
├── PRODUCT_ROADMAP.md              # Product roadmap from V1 to public release
├── webweave-roadmap.excalidraw     # Visual roadmap diagram
├── next.config.js
├── package.json
├── package-lock.json
└── README.md
```

Generated example scripts and manual HRIS scripts were removed from the repository to avoid storing credentials or sensitive customer/test data.

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

Implemented in V1:

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

Still required before public launch:

- Authentication.
- Per-user quotas.
- Billing guardrails.
- Stronger browser sandbox/isolation.
- Privacy policy and terms of service.
- Data retention controls.
- Abuse monitoring and audit logs.

## Roadmap

Detailed roadmap:

- `PRODUCT_ROADMAP.md`
- `webweave-roadmap.excalidraw`

V2 progress completed:

1. Selector confidence scoring.
2. Locator candidate list in UI.
3. Static generated-code quality checks.
4. Regeneration with feedback.
5. Cross-framework locator/safe-action rules.
6. Framework-specific static checks for Playwright, Puppeteer, Selenium, and Cypress.
7. OrangeHRM-specific reliability guidance discovered from real validation.
8. Puppeteer 25 compatibility guidance.
9. Windows-safe generated output checks.

Next reliability priorities:

1. Fix remaining Selenium post-save over-verification.
2. Fix Cypress candidate-resolution helper timing.
3. Add strict validation mode that blocks generated output with failing static checks.
4. Add sandboxed generated-script runner and one-shot auto-fix loop.
5. Draft private beta privacy and data retention copy.

## Verification

Latest verified state:

- `npm run build` passes.
- Generated SauceDemo Playwright Python script completed login, add-to-cart, checkout, and finish flow successfully in an earlier validation cycle.
- Generated OrangeHRM Playwright JavaScript script completed login, PIM navigation, Add Employee, Save, and `viewPersonalDetails` confirmation.
- Generated OrangeHRM Playwright Python script completed login, PIM navigation, Add Employee, Save, and `viewPersonalDetails` confirmation.
- Generated OrangeHRM Puppeteer script completed the flow after local compatibility patch for `headless: 'shell'` and Puppeteer 25 timeout API removal.
- Generated OrangeHRM Selenium script reached save success signal but failed later on overly strict heading verification.
- Generated OrangeHRM Cypress spec ran under Cypress 15 but failed due to helper candidate timing.
- V2 UI shows ranked locator candidates and static validation checks after generation.
- Initial UI now uses a v0-style prompt-first layout.
- Generated workspace now separates prompt/logs from browser preview and generated code.
- Right workspace section scrolls independently; generated code no longer traps vertical scrolling.
- Headless loading state now visualizes Playwright `headless: true` locator discovery instead of a generic scan animation.
- Button and navigation controls have hover/click micro-interactions.
- Custom circular WebWeave logo appears in the UI and browser tab.
- Generated output includes a quality gate badge.
- Downloaded script files are named by selected framework.
- Stale generated script files and hardcoded credential examples removed.
- WebWeave `cypress` artifact folder removed.
- Excalidraw roadmap JSON validates.

## Changelog

### v1.4.0 - Branding and Quality Gate Polish

- Added custom WebWeave SVG logo to the UI.
- Added `/logo` route to serve the logo as SVG.
- Wrapped the logo SVG in a circular clip path so the UI logo and browser tab icon appear round.
- Added metadata icons for browser tab favicon, shortcut icon, and Apple icon.
- Added generated-output quality gate badge to the code toolbar.
- Added stronger Selenium/Cypress static checks for helper issues, raw locators, and retry-unsafe Cypress candidates.
- Updated downloaded script filenames to use the selected framework name, for example `selenium-python_automation.py`.

### v1.3.0 - v0-style UI/UX Polish

- Reworked the default page into a prompt-first AI builder layout inspired by v0.dev.
- Added a left sidebar with project navigation, recent runs, and local beta status.
- Split generated mode into left prompt/log/regenerate section and right preview/code workspace.
- Replaced generic loading scan with a headless Playwright runner animation showing `headless: true` and locator discovery steps.
- Added smooth workspace appear animations after clicking Generate.
- Added hover/click/focus micro-interactions for buttons, navigation items, theme toggle, and copy/download actions.
- Fixed generated-workspace scrolling so the right section scrolls down to preview, locator candidates, and generated code.
- Removed the Cypress artifact folder from the project.
- Updated README and Excalidraw with latest UI/UX progress.

### v1.2.0 - Cross-framework Validation and Documentation Update

- Ran real OrangeHRM add-employee generation across Playwright JS, Playwright Python, Puppeteer JS, Selenium Python, and Cypress JS.
- Verified Playwright JS and Playwright Python generated flows end-to-end.
- Identified and patched Puppeteer guidance for local Chrome startup and Puppeteer 25 API compatibility.
- Added OrangeHRM PIM-specific guidance for menu fallback, scoped Add button selectors, required-field-only Add Employee flow, and save confirmation.
- Added Selenium locator tuple guidance requiring `By.*` constants.
- Added static check for removed Puppeteer `page.waitForTimeout()` usage.
- Added README execution progress V1-V6 and framework validation evidence.
- Updated Excalidraw roadmap with main project journey flowchart and detailed V1-V6 execution flow.

### v1.1.0 - V2 Reliable Generation Progress

- Added selector confidence scoring for extracted DOM elements.
- Added `locatorSummary` response data with top ranked selector candidates.
- Added locator candidate list in the UI.
- Added static generated-code quality checks.
- Added `qualityChecks` response data for validation visibility.
- Added UI panel for generated-code static validation results.
- Added regenerate-with-feedback workflow.
- Added cross-framework locator helper contract for Playwright, Puppeteer, Selenium, and Cypress.
- Expanded static checks for framework-specific selector and API mistakes.
- Improved code extraction for CRLF/unclosed markdown fences and added truncation/completeness heuristics.
- Increased generation output budget to reduce incomplete scripts.

### v1.0.0 - Safety MVP and UI Refresh

- Removed debug endpoint.
- Added URL validation and SSRF guardrails.
- Added request, prompt, and DOM context limits.
- Added basic per-client rate limiting.
- Removed generated sample scripts and credential-bearing artifacts.
- Added Chromium locator preview screenshot.
- Redesigned UI with solid vibrant browser-lab styling and dark/light mode.
- Improved generation prompt with locator validators and dynamic-list handling rules.
- Added support for domain-only URL input by normalizing to `https://`.

### v0.3.0

- Removed browser-side API key UI.
- Added server-side provider auto-detection.
- Improved prompt engineering for DOM-grounded selectors.
- Added key element extraction.
- Replaced `networkidle` guidance with `domcontentloaded` and explicit waits.

### v0.2.0

- Added OpenCode Go provider.
- Fixed Gemini and OpenRouter model defaults.
- Added temporary debug endpoint for local troubleshooting, later removed in V1.

### v0.1.0

- Initial Next.js 14 application.
- Playwright headless DOM scraping.
- Multi-provider AI generation.
- Multi-framework output.

## License

MIT License.
