# Account Settings Billing + Light Mode Design

## Goal

Fix Account Settings so it follows the active light/dark theme, then add a Billing section inside the same modal.

The Billing section must show account-specific data, not hardcoded billing values. Labels must use the existing i18n system.

## Current Context

- `SettingsModal` currently only contains language controls.
- `SettingsModal.module.css` still has hardcoded dark modal and section backgrounds.
- `GET /api/account/billing` already returns billing data:
  - `planId`, `planLabel`, `billingCycle`, `billingProvider`, `billingPeriodEndsAt`, `expired`, `daysUntilExpiry`.
  - `quota` usage data.
  - `allowedFrameworks`, `projectLimit`.
  - recent `orders` from `billing_orders`.
- Existing pricing and cancel-plan flows remain separate.

## Non-Hardcoding Requirements

- Do not hardcode plan state, expiration dates, payment history, usage numbers, provider status, or invoice rows.
- Billing values must come from `/api/account/billing` or existing plan/quota context.
- UI copy must be added to `src/lib/i18n/translations.js` and read with `t(...)`.
- Date/amount/status formatting can use small local helpers, but source values must come from API data.
- Payment method must show provider from API. If absent, show translated empty state.

## UX Design

Account Settings remains one modal.

Sections:

1. Language
   - Existing language selector stays first.
   - Visual styling changes to theme variables only.

2. Billing
   - Header with billing icon, title, and short description.
   - Loading state while fetching billing.
   - Error state if billing API fails.
   - Signed-out/Supabase-disabled state when billing data cannot be fetched.
   - Current plan summary card.
   - Billing detail grid:
     - Current plan.
     - Billing cycle.
     - Expiration date or Free-plan/no-expiry label.
     - Payment method/provider.
   - Usage row:
     - Monthly generations used/limit.
     - Remaining quota.
     - Project limit.
     - Available framework count.
   - Invoices/payment history:
     - Show recent orders from `billing.orders`.
     - Each row shows order ID, plan/cycle, amount, status, and created date.
     - If no orders, show translated empty state.
   - Action button:
     - `Manage plan` opens Pricing via parent handler.
     - No PDF/download invoice action for now because no invoice artifact exists.

## Visual Theme Rules

- Replace hardcoded modal background `rgba(10, 10, 10, 0.96)` with `var(--surface)` or gradient using existing theme variables.
- Replace hardcoded section background `rgba(20, 20, 20, 0.6)` with `var(--surface-2)`.
- Keep blue accents through `var(--blue)`.
- Use existing modal overlay/backdrop behavior.
- Keep mobile behavior: modal full width under `520px`, sections stack, invoice rows wrap cleanly.

## Data Flow

`SettingsModal` will consume `useWebWeave()` for `user`, `SUPABASE_ENABLED`, and `getAuthHeaders`.

On modal open:

1. If Supabase disabled or user missing, skip fetch and show appropriate billing unavailable state.
2. If signed in, fetch `/api/account/billing` with auth headers.
3. Store `billing`, `billingLoading`, and `billingError` in local modal state.
4. Render values from returned `billing` object.

The modal does not mutate billing state. Plan changes continue through Pricing page.

## Error Handling

- Missing Supabase config: show translated storage/billing unavailable state.
- Signed out: show translated sign-in required state.
- API error: show translated fallback plus server message when available.
- Missing payment provider: show translated `No payment method`.
- Missing expiration date: show translated `No expiration` for Free, otherwise `Not available`.
- Empty orders: show translated `No invoices yet`.

## Testing

Add a static verification script for Account Settings billing/theme guardrails:

- Settings modal imports/uses `useWebWeave`.
- Settings modal fetches `/api/account/billing`.
- Settings modal renders translated billing fields.
- Settings CSS does not contain the old hardcoded dark modal background.
- Settings CSS uses `var(--surface)`, `var(--surface-2)`, `var(--text)`, `var(--muted)`, and `var(--border)`.
- Translations contain EN/ID billing settings copy.

Run:

- New settings billing verification script.
- Existing responsive verifier.
- `npm run build`.

## Out of Scope

- Real invoice PDF generation.
- New billing database tables.
- Updating/canceling subscription directly inside Account Settings.
- Adding card management or stored payment methods.
- Replacing Midtrans sandbox billing.
