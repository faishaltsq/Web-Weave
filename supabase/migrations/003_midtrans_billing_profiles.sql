-- Midtrans billing metadata and one-time payment entitlement expiry.

alter table public.profiles
add column if not exists billing_provider text,
add column if not exists billing_period_ends_at timestamptz,
add column if not exists midtrans_order_id text,
add column if not exists midtrans_transaction_id text,
add column if not exists midtrans_status text;

create index if not exists profiles_billing_provider_idx on public.profiles(billing_provider);
create index if not exists profiles_billing_period_ends_at_idx on public.profiles(billing_period_ends_at);
create index if not exists profiles_midtrans_order_id_idx on public.profiles(midtrans_order_id);
create index if not exists profiles_midtrans_transaction_id_idx on public.profiles(midtrans_transaction_id);

-- Billing entitlement fields are service-role-only; clients may update profile identity fields only.
revoke update on public.profiles from anon, authenticated;
grant update (email, full_name, updated_at) on public.profiles to authenticated;
