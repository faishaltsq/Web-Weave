# Account Settings Invoice PDF Design

## Goal

Improve Account Settings Billing by fixing the `Current plan` spacing and allowing users to download a real PDF invoice by clicking an invoice row.

## Requirements

- Add visual spacing between the `Current plan` label and the plan value.
- Invoice rows in Account Settings become clickable controls.
- Clicking an invoice row downloads a real PDF file, not HTML or TXT.
- PDF data must come from server-side `billing_orders` records owned by the signed-in user.
- No hardcoded billing values in UI or PDF.
- Keep existing Billing section data loading through `/api/account/billing`.

## Architecture

Add one authenticated API route:

- `GET /api/account/invoices/[orderId]`

The route will:

1. Require Supabase server config.
2. Authenticate the request.
3. Load exactly one `billing_orders` row by `owner_id` and `order_id`.
4. Return `404` if the order is not owned by the current user.
5. Generate a simple PDF invoice using `pdf-lib`.
6. Return `application/pdf` with `Content-Disposition: attachment; filename="webweave-invoice-<orderId>.pdf"`.

Client behavior:

- `SettingsModal` invoice rows become buttons.
- On click, fetch invoice API with auth headers.
- Convert response to blob.
- Trigger browser download.
- Show a short translated error if download fails.

## PDF Contents

The PDF will include:

- WebWeave invoice title.
- Invoice/order ID.
- Plan.
- Billing cycle.
- Amount.
- Payment status.
- Created date.
- Payment provider if available in order data or fallback from billing profile when available.

## Data Source

- Invoice rows use existing `billing.orders` from `/api/account/billing`.
- PDF route queries `billing_orders` directly and only exposes records owned by the authenticated user.
- The route may also query `profiles.billing_provider` for provider display.

## Dependencies

Add dependency:

- `pdf-lib`

Reason: lightweight server-side PDF generation without browser automation or native binaries.

## UI Details

- Current plan card will render label and plan value with a small vertical gap.
- Invoice rows keep existing visual layout but use `button type="button"` semantics.
- Add hover/focus styles to show rows are clickable.
- Add disabled/loading style while one invoice is downloading.

## Error Handling

- Missing auth: return authenticated-user error from existing helper.
- Unknown or unowned invoice: `404` JSON error.
- PDF generation failure: `500` JSON error.
- Client download failure: translated inline error in Billing section.

## Testing

Add static verification script for:

- `pdf-lib` dependency exists.
- Invoice API route exists and imports `PDFDocument`.
- API route queries `billing_orders` with `owner_id` and `order_id`.
- API route returns `application/pdf` and attachment filename.
- SettingsModal invoice rows are buttons.
- SettingsModal downloads invoice blobs.
- Current plan CSS includes label/value spacing.

Run:

- New invoice PDF verification script.
- Account Settings billing verification.
- `npm run build`.

## Out of Scope

- Rich branded PDF design.
- Invoice PDF persistence/storage.
- Emailing invoices.
- Tax calculation or legal invoice numbering beyond existing `order_id`.
