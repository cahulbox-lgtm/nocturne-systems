-- Run once in Supabase SQL editor before enabling checkout.
create table if not exists public.checkout_orders (
 id bigint generated always as identity primary key,
 reference text not null unique,
 product_name text not null,
 product_slug text not null,
 license_name text not null,
 amount_usd numeric(12,2) not null check (amount_usd > 0),
 payment_method text not null check (payment_method in ('card','paypal','crypto','binance')),
 email text not null,
 discord_username text not null,
 status text not null default 'pending_payment' check (status in ('pending_payment','payment_review','paid','cancelled','fulfilled')),
 created_at timestamptz not null default now()
);
alter table public.checkout_orders enable row level security;
-- No public policies. Access only through server-side service role.
create index if not exists checkout_orders_created_at_idx on public.checkout_orders(created_at desc);
