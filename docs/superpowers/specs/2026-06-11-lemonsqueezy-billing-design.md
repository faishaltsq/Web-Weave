# LemonSqueezy Billing Integration Design

## Goal

Integrate LemonSqueezy payments into WebWeave without blocking development on final LemonSqueezy store validation, API keys, webhook URL, or variant IDs.

The integration must be safe when billing environment variables are missing. Pricing CTAs should show a clear configuration message instead of crashing. Once LemonSqueezy is ready, the owner only needs to fill environment variables and configure the webhook callback URL.

## Current Context

WebWeave already has:

- Supabase authentication.
- `profiles.plan` and `profiles.monthly_generation_limit`.
- `usage_events` for generation usage tracking.
- Pricing modal with Free, Starter, Pro, and disabled Team plans.
- Server-side API patterns using `getAuthenticatedUser(req)` and Supabase service role.

Billing is not implemented yet. Pricing CTAs are currently mock interactions.

## Recommended Approach

Use server-created LemonSqueezy checkouts and signed webhooks.

This is the safest approach because the browser never decides that a user has paid. The browser only asks WebWeave to create a checkout. LemonSqueezy confirms payment/subscription status later through a signed webhook. WebWeave then updates Supabase entitlements.

## Non-Goals

- No real secrets committed.
- No Team checkout yet. Team remains disabled.
- No usage-based billing in LemonSqueezy yet.
- No customer portal integration in the first pass.
- No public launch/legal pages in this first pass.

## Plans And Entitlements

Free:
- `plan`: `free`
- `monthly_generation_limit`: `30`

Starter:
- `plan`: `starter`
- `monthly_generation_limit`: `500`
- Monthly variant env: `LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID`
- Annual variant env: `LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID`

Pro:
- `plan`: `pro`
- `monthly_generation_limit`: `2000`
- Monthly variant env: `LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID`
- Annual variant env: `LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID`

Team:
- `plan`: `team`
- `monthly_generation_limit`: `8000`
- Temporarily disabled in UI. No checkout route support in first pass.

## Database Changes

Add billing metadata to `public.profiles`:

```sql
alter table public.profiles
add column if not exists lemon_customer_id text,
add column if not exists lemon_subscription_id text,
add column if not exists lemon_variant_id text,
add column if not exists lemon_status text,
add column if not exists billing_cycle text,
add column if not exists billing_updated_at timestamptz;
```

The webhook handler uses Supabase service role to update profiles by `id`, because LemonSqueezy webhook requests are not user-authenticated Supabase sessions.

## Environment Variables

Environment variables can be filled last.

```env
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_TEST_MODE=true

LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID=
LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If any required variable is missing, checkout creation returns a controlled JSON error:

```json
{
  "success": false,
  "configured": false,
  "error": "Payment gateway is not configured yet."
}
```

## API Design

### `POST /api/billing/checkout`

Purpose: authenticated route that creates a LemonSqueezy checkout URL.

Request:

```json
{
  "plan": "starter",
  "billingCycle": "monthly"
}
```

Validation:
- Requires Supabase auth token.
- Allows only `starter` and `pro`.
- Allows only `monthly` and `annual`.
- Rejects disabled `team`.
- Rejects unknown plans.
- Returns safe unconfigured error if LemonSqueezy env is incomplete.

Checkout creation:
- Calls `POST https://api.lemonsqueezy.com/v1/checkouts`.
- Uses `checkout_data.email` from authenticated user.
- Uses `checkout_data.custom.user_id` with Supabase user ID.
- Uses `checkout_data.custom.plan` and `checkout_data.custom.billing_cycle`.
- Uses product options redirect URL back to `NEXT_PUBLIC_APP_URL`.
- Uses `test_mode` from `LEMONSQUEEZY_TEST_MODE`.

Response:

```json
{
  "success": true,
  "checkoutUrl": "https://..."
}
```

### `POST /api/billing/webhook`

Purpose: public LemonSqueezy webhook callback.

Security:
- Read raw request body.
- Verify `X-Signature` using HMAC SHA256 and `LEMONSQUEEZY_WEBHOOK_SECRET`.
- Use `crypto.timingSafeEqual`.
- Reject missing/invalid signature.

Events handled:
- `subscription_created`
- `subscription_updated`
- `subscription_payment_success`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`

Data mapping:
- Use `meta.custom_data.user_id` as Supabase profile ID.
- Use `meta.custom_data.plan` when available.
- Fallback to variant ID mapping if custom data is absent.
- Update `profiles.plan`, `monthly_generation_limit`, Lemon IDs/status, and `billing_updated_at`.

Subscription status behavior:
- Active-like statuses keep paid plan: `active`, `on_trial`, `resumed`.
- Cancelled but not expired may keep access until period end if Lemon status indicates active/cancelled grace period.
- Expired, paused, or unpaid statuses downgrade to `free`.

## Frontend Design

Pricing CTA buttons change from mock-only to real checkout attempts.

Behavior:
- If user is not signed in, show message: sign in required before checkout.
- If plan is disabled, button remains disabled.
- For Starter/Pro, call `/api/billing/checkout` with current billing cycle.
- On success, redirect `window.location.href` to `checkoutUrl`.
- On unconfigured/error, show message in pricing action toast.

The current mock message stays useful as fallback copy for unconfigured env.

## Quota Enforcement

First pass adds billing entitlements but should not launch paid access without quota enforcement.

`/api/generate` should later enforce:
- Authenticated users get profile limits.
- Count current-month `usage_events` where `event_type` is generation-related.
- Reject if user exceeds `monthly_generation_limit`.

For this integration pass, quota enforcement is recommended if time permits. If deferred, UI must still not promise paid production access.

## LemonSqueezy Setup Tutorial

1. Register/login to LemonSqueezy.
2. Enable Test Mode.
3. Create store: `WebWeave`.
4. Create subscription product: `WebWeave Starter`.
5. Add variants:
   - Starter Monthly: Rp49.000/month.
   - Starter Annual: around Rp470.000/year.
6. Create subscription product: `WebWeave Pro`.
7. Add variants:
   - Pro Monthly: Rp129.000/month.
   - Pro Annual: around Rp1.238.000/year.
8. Copy store ID and variant IDs.
9. Create API key.
10. For local testing, run `ngrok http 3000`.
11. Create webhook with callback URL:
    - Local: `https://<ngrok-id>.ngrok-free.app/api/billing/webhook`
    - Production: `https://<domain>/api/billing/webhook`
12. Create signing secret and copy it to `LEMONSQUEEZY_WEBHOOK_SECRET`.
13. Subscribe webhook to subscription lifecycle events.
14. Fill `.env.local` and restart Next.js dev server.
15. Test Starter checkout in LemonSqueezy Test Mode.
16. Confirm Supabase `profiles` row updates after webhook delivery.

## Error Handling

- Missing billing env returns a clear configuration error.
- LemonSqueezy API failure returns generic user-safe message and logs server-side details.
- Invalid webhook signature returns `401`.
- Unknown webhook event returns `200` with ignored status to avoid retries for unsupported events.
- Missing `user_id` in webhook returns `400` because the event cannot be linked safely.

## Testing

Add lightweight verification script coverage for:
- Checkout route exists.
- Webhook route exists.
- Webhook HMAC verification token exists.
- Pricing page calls checkout API.
- Env placeholder names exist in `.env.local.example`.

Manual testing:
- Pricing CTA when not logged in.
- Pricing CTA when env missing.
- Pricing CTA with test env filled.
- Webhook signature rejection.
- Successful `subscription_created` webhook updates profile.

## Acceptance Criteria

- App builds with missing LemonSqueezy env.
- Starter/Pro CTA no longer mock-only.
- Missing env produces friendly UI message.
- Valid checkout returns LemonSqueezy URL.
- Signed webhook can update profile entitlements.
- Invalid webhook signature is rejected.
- Team remains disabled.
- Tutorial is documented.
