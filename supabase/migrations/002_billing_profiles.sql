-- LemonSqueezy billing metadata for WebWeave profiles.

alter table public.profiles
add column if not exists lemon_customer_id text,
add column if not exists lemon_subscription_id text,
add column if not exists lemon_variant_id text,
add column if not exists lemon_status text,
add column if not exists billing_cycle text,
add column if not exists billing_updated_at timestamptz;

create index if not exists profiles_lemon_customer_id_idx on public.profiles(lemon_customer_id);
create index if not exists profiles_lemon_subscription_id_idx on public.profiles(lemon_subscription_id);
