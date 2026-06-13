-- Trusted Midtrans order records used by webhook entitlement updates.

create table if not exists public.billing_orders (
  order_id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  billing_cycle text not null,
  amount integer not null,
  status text not null default 'checkout_created',
  midtrans_transaction_id text,
  billing_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_orders_owner_id_created_at_idx on public.billing_orders(owner_id, created_at desc);
create index if not exists billing_orders_status_idx on public.billing_orders(status);
create index if not exists billing_orders_midtrans_transaction_id_idx on public.billing_orders(midtrans_transaction_id);

alter table public.billing_orders enable row level security;

drop policy if exists "billing orders are owner readable" on public.billing_orders;
create policy "billing orders are owner readable" on public.billing_orders for select using (owner_id = auth.uid());

revoke insert, update, delete on public.billing_orders from anon, authenticated;
grant select on public.billing_orders to authenticated;
