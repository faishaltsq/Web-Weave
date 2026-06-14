# SaaS Pricing and Monthly Quota Design

Date: 2026-06-13

## Goal

Implement WebWeave SaaS pricing and monthly generation quotas using Midtrans as the active billing provider. Quota enforcement must happen before expensive scraping or AI work, and usage must increment only after successful generation.

## Plans

Central plan configuration lives in `src/lib/billing/plans.js` and is the source of truth for backend enforcement and frontend display.

| Plan | Price | Monthly generations | Projects | Framework access | Public status |
| --- | ---: | ---: | ---: | --- | --- |
| Free | Rp0 | 5 | 1 | Playwright JavaScript | Active |
| Starter | Rp49.000/month | 75 | 5 | Playwright JS, Playwright Python, Selenium Python, Cypress JS | Active |
| Pro | Rp129.000/month | 300 | 25 projects for current enforcement | All supported frameworks | Active |
| Team | Rp299.000/month | 1.000 | Team-level future capacity | All supported frameworks | Disabled, coming soon |

No plan uses unlimited generations. Team remains configured for future activation but cannot be checked out from the current UI/API. If existing UI copy previously implied unlimited Pro projects, replace it with a concrete `25 projects` limit for this iteration.

## Architecture

Use a small helper layer around the existing schema instead of adding a new usage table now.

Key units:

- `plans.js`: plan metadata, limits, prices, allowed frameworks, disabled status.
- Generate quota helpers in or near `src/app/api/generate/route.js`: resolve current plan, count current-month successful generations, check quota, check framework access, record successful usage.
- Pricing UI: reads or mirrors central plan values where practical and displays new prices/limits.
- Main app UI: displays current quota and disables unsupported frameworks for current plan.

The existing `usage_events` table remains the usage ledger. Successful generations are recorded with `event_type = 'generation_requested'` and `quantity = 1`.

## Backend Flow

`POST /api/generate` validates inputs in this order:

1. Request size, JSON parsing, required fields, URL and prompt validation.
2. Auth/session resolution.
3. Plan resolution from `profiles.plan`; default to `free` when missing.
4. Framework access check against current plan.
5. Monthly usage count from `usage_events` for the current calendar month.
6. Quota check before browser launch, page navigation, DOM scraping, or AI generation.
7. Existing SSRF, post-navigation, prompt-injection, browser, and AI guardrails.
8. Record one usage event only after generation succeeds and response code is ready.

Quota exceeded response:

```text
Monthly generation limit reached. Please upgrade your plan to continue.
```

Unsupported framework response should be a clear 403/plan-gating error and must not consume quota.

Generation failures must not consume quota, including invalid URL, blocked/private URL, missing prompt, unsupported framework, provider error, browser failure, AI failure, and safety gate failure.

## Frontend Flow

Pricing page updates:

- Free: 5 generations/month, Rp0.
- Starter: 75 generations/month, Rp49.000/month.
- Pro: 300 generations/month, Rp129.000/month.
- Team: 1.000 generations/month, Rp299.000/month, disabled/coming soon.
- Keep existing v0-style modal/card design and responsive behavior.

Main page updates:

- Show quota indicator near Generate, using current usage and limit.
- Disable unsupported framework choices for current plan, with upgrade copy.
- Disable Team checkout path in UI.
- When quota is exhausted, disable Generate or show the exact backend quota message before submit where current state allows.

Frontend gating improves UX only. Backend remains authoritative.

## Billing

Midtrans remains the only active checkout path.

- Starter and Pro checkout stay active.
- Team checkout returns disabled/coming-soon behavior.
- LemonSqueezy webhook remains disabled with `410`.
- Midtrans webhook continues to update `profiles.plan`, `monthly_generation_limit`, billing status, and expiry based on trusted `billing_orders`.

Plan limits in billing code must match central plan config. Duplicate hard-coded limits should be removed where practical.

## Data Model

No new migration for quota is required in this iteration.

Quota counting uses existing `usage_events`:

- `user_id`: current user.
- `event_type`: `generation_requested`.
- `quantity`: generation count.
- `created_at`: used for calendar-month window.

Current month starts at UTC month boundary unless existing helper already defines a different calendar-month boundary. This keeps behavior consistent with current implementation.

## Error Handling

- Quota check failure returns the exact required message and does not launch browser or call AI.
- Framework access failure returns a plan-gating error and does not consume quota.
- When Supabase server config exists, generation requires auth because anonymous monthly quota cannot be enforced safely. Local development without Supabase config may keep the existing non-blocking behavior.
- Billing/team disabled errors should not create Midtrans orders.
- Existing security guardrails remain intact.

## Verification

Add or update verification scripts to cover:

- Plan config contains exact limits and prices.
- No plan has unlimited generation.
- Team is configured but disabled.
- `/api/generate` checks quota before browser/AI work.
- Successful generation records exactly one usage event.
- Validation, browser, AI, unsupported framework, and safety failures do not record usage.
- Free allows only Playwright JS.
- Starter allows Playwright JS/Python, Selenium Python, and Cypress JS.
- Pro allows all supported frameworks.
- Required quota exceeded string is present.
- Pricing UI displays new plan limits/prices and disabled Team state.

Run existing build and verification commands after implementation.

## Out of Scope

- Dedicated monthly usage table.
- Team seats, team projects, member management, or team checkout activation.
- LemonSqueezy reactivation.
- Network-level egress firewalling beyond existing app-layer SSRF checks.
- Changing payment provider away from Midtrans.
