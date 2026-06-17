-- Store Midtrans Snap links for customer-facing payment/receipt access.

alter table public.billing_orders
  add column if not exists midtrans_redirect_url text,
  add column if not exists midtrans_snap_token text;
