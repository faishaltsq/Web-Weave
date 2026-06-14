# Midtrans Sandbox Billing Design

## Goal

Add Midtrans Snap sandbox payments as WebWeave's primary checkout path while keeping the existing LemonSqueezy implementation available in code for later reuse. The first Midtrans version uses one-time payments, not recurring subscriptions.

## Scope

- Use Midtrans Snap sandbox for Starter and Pro checkout.
- Redirect users from the existing pricing CTA to Midtrans Snap checkout.
- Verify Midtrans payment notifications with the Midtrans signature key.
- Unlock paid plan quota after successful payment.
- Expire paid access after 30 days for monthly payments or 365 days for annual payments.
- Keep LemonSqueezy files and docs in place, but do not use LemonSqueezy from the default checkout route.

Out of scope:

- Midtrans recurring subscriptions.
- Team plan checkout.
- Production Midtrans activation beyond env-supported endpoint switching.

## Architecture

Add `src/lib/billing/midtrans.js` as the Midtrans-specific billing helper. It will own config resolution, Snap transaction creation, signature verification, status normalization, and entitlement mapping.

Keep `src/lib/billing/plans.js` as the plan source of truth. Add Midtrans price mapping per plan and billing cycle so checkout amounts are not duplicated in UI code.

Reuse `POST /api/billing/checkout` as the single pricing checkout API. This route will validate the authenticated user and plan, then call Midtrans Snap. It will return `{ success: true, checkoutUrl }` to match the current UI contract.

Add `POST /api/billing/midtrans/webhook` for Midtrans notifications. The webhook route will verify the notification signature before updating Supabase.

Keep LemonSqueezy implementation files unchanged unless import cleanup is needed. LemonSqueezy will not be the default checkout provider.

## Data Model

Add a migration with payment metadata and entitlement expiry fields on `public.profiles`:

- `billing_provider text`
- `billing_period_ends_at timestamptz`
- `midtrans_order_id text`
- `midtrans_transaction_id text`
- `midtrans_status text`

Existing fields continue to be used:

- `plan`
- `monthly_generation_limit`
- `billing_cycle`
- `billing_updated_at`

## Checkout Flow

1. User clicks Starter or Pro in the pricing modal.
2. UI calls `POST /api/billing/checkout` with `{ plan, billingCycle }`.
3. Server validates auth, plan existence, and checkout eligibility.
4. Server creates a Midtrans Snap transaction using sandbox endpoint when `MIDTRANS_IS_PRODUCTION=false`.
5. Transaction payload includes:
   - `order_id` in format `ww_<user-prefix>_<plan>_<cycle>_<timestamp>`.
   - `gross_amount` from plan/cycle price mapping.
   - customer email/name from Supabase user metadata.
   - `custom_field1 = user_id`.
   - `custom_field2 = plan`.
   - `custom_field3 = billing_cycle`.
6. API returns Midtrans `redirect_url` as `checkoutUrl`.
7. Existing pricing UI redirects to that URL.

## Webhook Flow

Midtrans posts notifications to `/api/billing/midtrans/webhook`.

The route verifies signature using:

```text
SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
```

If signature verification fails, return `401` and do not update data.

If transaction status is `settlement` or `capture`, update the user profile:

- `plan` to Starter or Pro.
- `monthly_generation_limit` from plan config.
- `billing_cycle` from `custom_field3`.
- `billing_provider = "midtrans"`.
- `billing_period_ends_at = now + 30 days` for monthly, or `now + 365 days` for annual.
- Midtrans order, transaction, and status fields.
- `billing_updated_at = now`.

If transaction status is `expire`, `cancel`, `deny`, or `failure`, save status metadata but do not upgrade the plan.

## Quota And Expiry

The existing `/api/generate` quota check remains responsible for enforcing monthly generation limits.

Add an expiry guard when reading authenticated profile data. If `billing_period_ends_at` exists and is earlier than current time, treat the user as Free for quota enforcement. This prevents one-time Midtrans payments from granting permanent access.

This first version does not automatically downgrade expired profiles in the database. It only enforces Free limits at generation time. A scheduled cleanup can be added later if needed.

## Configuration

Add these env entries to `.env.local.example`:

```text
MIDTRANS_SERVER_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

Reuse existing `NEXT_PUBLIC_APP_URL` for callbacks/finish URLs.

Midtrans endpoints:

- Sandbox Snap: `https://app.sandbox.midtrans.com/snap/v1/transactions`
- Production Snap: `https://app.midtrans.com/snap/v1/transactions`

Auth uses HTTP Basic with `MIDTRANS_SERVER_KEY + ":"` base64 encoded.

## Error Handling

- Missing Midtrans server key returns `503` with `Payment gateway is not configured yet.`
- Unknown plan returns `400` with `Unknown billing plan.`
- Disabled plan returns `400` with `This plan is not available for checkout.`
- Midtrans API failures log server-side detail and return a safe checkout error.
- Webhook missing or invalid signature returns `401 Invalid signature.`
- Webhook missing user/plan/cycle custom fields returns `400` without updating profiles.

## Testing

Add `scripts/verify-midtrans-integration.mjs` to verify source-level integration markers:

- Midtrans helper exists.
- Sandbox and production Snap endpoints exist.
- Env names exist.
- Basic auth implementation exists.
- Signature verification uses SHA512 over order/status/amount/server key.
- Checkout route imports/calls Midtrans helper.
- Midtrans webhook route exists and updates `profiles`.
- Migration adds Midtrans and expiry profile fields.
- Generate route checks `billing_period_ends_at`.

Run verification after implementation:

```text
node scripts/verify-midtrans-integration.mjs
node scripts/verify-billing-integration.mjs
node scripts/verify-pricing-page.mjs
node scripts/verify-generate-guardrails.mjs
npm run build
```

Manual sandbox test after env setup:

1. Fill Midtrans sandbox keys in `.env.local`.
2. Start local app and expose webhook with ngrok.
3. Set Midtrans payment notification URL to `/api/billing/midtrans/webhook`.
4. Click Starter monthly in pricing modal.
5. Pay with Midtrans sandbox test card.
6. Confirm Supabase profile plan, quota, billing provider, Midtrans IDs, and expiry are updated.
