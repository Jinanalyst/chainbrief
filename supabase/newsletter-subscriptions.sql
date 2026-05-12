-- Chain Brief — newsletter subscriptions table
-- Apply in the Supabase SQL editor.
--
-- This table stores email-based newsletter subscriptions that do NOT require
-- a Supabase auth account. The `analyst_id` is the slugified display name
-- used throughout the localStorage-based analyst system (e.g. "john-kim").
-- Premium subscriptions are tracked here after a successful Stripe checkout.

create table if not exists public.newsletter_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  analyst_id     text not null,           -- slugified analyst name, e.g. "john-kim"
  email          text not null,
  plan           text not null default 'free' check (plan in ('free', 'premium')),
  stripe_session_id text,                 -- Stripe checkout session id for premium
  confirmed      boolean not null default true,
  subscribed_at  timestamptz not null default now(),
  cancelled_at   timestamptz,
  unique (analyst_id, email)
);

-- Index for fast lookup by analyst
create index if not exists newsletter_subscriptions_analyst_id_idx
  on public.newsletter_subscriptions (analyst_id);

-- RLS: anyone can insert (subscribe), only the server-side service role reads all
alter table public.newsletter_subscriptions enable row level security;

-- Public can subscribe (insert their own email)
create policy "anyone can subscribe"
  on public.newsletter_subscriptions for insert
  with check (true);

-- No public reads (email privacy); reads done via service-role in API routes
create policy "no public reads"
  on public.newsletter_subscriptions for select
  using (false);
