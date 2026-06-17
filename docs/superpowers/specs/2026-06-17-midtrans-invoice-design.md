# Midtrans Invoice Design

**Date:** 2026-06-17
**Status:** draft

## Summary

Replace fake generated PDF invoices with official Midtrans Invoicing API. At checkout, create a Midtrans Invoice record alongside the existing Snap transaction. Store the invoice ID and returned PDF/payment URLs. When a user requests an invoice from Account Settings, fetch the official Midtrans invoice data and open the official `pdf_url`; fallback to payment link if no PDF available.

## Problem

Currently:
- Checkout creates a Snap transaction only (`POST /snap/v1/transactions`).
- `billing_orders` stores `midtrans_redirect_url` and `midtrans_snap_token` from Snap.
- Invoice route calls Snap status API (`GET /v2/{orderId}/status`), which does not return official invoice PDFs.
- Midtrans Invoicing API (`GET /v1/invoices/{invoice_id}`) returns `pdf_url`, `paid_pdf_url`, `quotation_pdf_url`, and `payment_link_url`, but requires a separate Invoice record with a valid `invoice_id`.

Existing `order_id` format (`ww_userPrefix_planId_cycle_timestamp`) exceeds the 36-character Invoice API limit for `order_id`.

## Design Decisions

1. **Keep Snap for payment UX, add Invoice creation at checkout.** Snap handles the payment UI/methods. Invoice provides the official PDF receipt.

2. **Shorten `order_id` for compatibility.** New format `ww_<12-char-prefix>_<9-char hash>` fits under 36 chars. Use the same `order_id` for both Snap and Invoice so they link naturally.

3. **Store invoice fields alongside existing Snap fields.** Add `midtrans_invoice_id`, `midtrans_invoice_pdf_url`, `midtrans_invoice_payment_link_url` to `billing_orders`. Keep existing `midtrans_redirect_url` and `midtrans_snap_token` for legacy orders.

4. **Legacy orders keep Snap fallback.** Orders without a stored invoice ID fall back to existing Snap redirect/token behavior. No breakage.

## Architecture

### Files Changed
- `src/lib/billing/midtrans.js` — add `createMidtransInvoice()`, `fetchMidtransInvoice()`, new `generateOrderId()`
- `src/app/api/billing/checkout/route.js` — call Invoice API after Snap, store invoice fields
- `src/app/api/account/invoices/[orderId]/route.js` — use stored invoice ID to fetch official invoice, fallback to legacy
- `src/lib/i18n/translations.js` — add "opening invoice" messages
- `src/components/SettingsModal.js` — minor message update if needed
- `supabase/migrations/006_midtrans_invoice_fields.sql` — new migration

### New Helpers (`src/lib/billing/midtrans.js`)

```
generateOrderId(userId, planId, cycle)
  → 'ww_<12-char-prefix>_<9-char-b64-hash>'
  Length always ≤ 36.

createMidtransInvoice({ orderId, planId, billingCycle, user, env })
  → POST /v1/invoices with transaction_details, customer, items
  → Returns { success, invoice_id, pdf_url, payment_link_url, invoice_number }

fetchMidtransInvoice(invoiceId, config)
  → GET /v1/invoices/{invoice_id}
  → Returns raw response with pdf_url, paid_pdf_url, quotation_pdf_url, payment_link_url
  → null if 404 or error

buildMidtransInvoiceUrl(invoiceId, config)
  → Full API URL for GET /v1/invoices/{invoice_id}
```

### Checkout Flow (updated)
1. Generate short `orderId`.
2. Create Snap transaction (existing).
3. Create Midtrans Invoice with same `orderId`.
4. Store both Snap URL/token AND invoice ID/PDF URL/payment link.

### Invoice Route Flow (updated)
1. Authenticate user, find order.
2. If order has `midtrans_invoice_id`:
   a. Call `GET /v1/invoices/{invoice_id}`.
   b. Return highest-priority URL: `pdf_url` > `paid_pdf_url` > `quotation_pdf_url` > `payment_link_url`.
3. If invoice API fails or invoice ID missing:
   a. Fallback to existing Snap status/redirect/token logic.
4. Return `{ success: true, midtransUrl }` or `{ success: false, error }`.

## Data Model

### Migration: `006_midtrans_invoice_fields.sql`

```sql
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS midtrans_invoice_id text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_pdf_url text,
  ADD COLUMN IF NOT EXISTS midtrans_invoice_payment_link_url text;
```

Existing columns retained: `midtrans_redirect_url`, `midtrans_snap_token`.

### `billing_orders` Final Schema (relevant columns)

| Column | Type | Source |
|--------|------|--------|
| order_id | text | Generated short ID |
| midtrans_redirect_url | text | Snap response |
| midtrans_snap_token | text | Snap response |
| midtrans_invoice_id | text | Invoice API response |
| midtrans_invoice_pdf_url | text | Invoice API response |
| midtrans_invoice_payment_link_url | text | Invoice API response |

## Client Changes

- `SettingsModal.js` `handleDownloadInvoice` opens the returned `midtransUrl` via `window.open`. No change needed — it already works this way.
- Translation keys for "opening invoice" and "invoice unavailable" already exist (`invoiceDownloadError`, etc.).
- Add translation key `invoiceOpening` for the "Opening invoice..." message shown before window.open.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invoice API returns `pdf_url` | Open official PDF |
| Invoice API returns only `payment_link_url` | Open payment/receipt page |
| Invoice API returns none | Fallback to Snap redirect, Snap token, then 200 error JSON |
| Invoice API 404 for valid invoice ID | Fallback to legacy Snap |
| Invoice API network error | Fallback to legacy Snap |
| No invoice ID and no Snap links | 200 JSON `{ success: false }` |
| Unauthenticated | 401 |
| Order not found | 404 |

## Testing

Update `scripts/verify-account-invoice-pdf.mjs`:
- Check for `midtrans_invoice_id` column in migration.
- Verify route imports `getMidtransConfig` and uses `/v1/invoices/`.
- Verify checkout generates short order IDs (under 36 chars).
- Verify checkout stores invoice fields.
- Keep existing legacy fallback checks.

## Rollout

1. Apply migration `006_midtrans_invoice_fields.sql` on Supabase staging.
2. Deploy updated checkout route (generates short IDs + creates invoices).
3. Deploy updated invoice route (reads invoice IDs, falls back legacy).
4. Old orders without invoice IDs work via fallback.
5. New orders get official invoice PDFs.
6. Run verification scripts.
7. `npm run build`.
8. Commit and push to `master`.
