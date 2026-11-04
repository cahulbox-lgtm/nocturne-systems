-- Run in Supabase SQL Editor once.
create table if not exists public.site_content (
  section text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
-- Only the server-side service role can read/write; browser uses /api/site-content.
revoke all on public.site_content from anon, authenticated;
