-- Chain Brief community and analyst-growth schema proposal.
-- Apply in Supabase SQL editor after reviewing project naming conventions.

create type public.chainbrief_role as enum (
  'user',
  'rookie_analyst',
  'rising_analyst',
  'verified_analyst',
  'partner_expert',
  'admin'
);

create type public.chainbrief_post_status as enum ('draft', 'published', 'archived');
create type public.chainbrief_application_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  bio text,
  role public.chainbrief_role not null default 'user',
  analyst_score integer not null default 0 check (analyst_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null,
  post_type text not null default 'general',
  coin_tags text[] not null default '{}',
  linked_news_id text,
  status public.chainbrief_post_status not null default 'published',
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analyst_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expertise text not null,
  bio text not null,
  sample_content text,
  sample_url text,
  markets text[] not null default '{}',
  no_investment_advice_agreed boolean not null default false,
  risk_disclosure_agreed boolean not null default false,
  status public.chainbrief_application_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.analyst_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  evidence_score integer not null default 0 check (evidence_score between 0 and 100),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  consistency_score integer not null default 0 check (consistency_score between 0 and 100),
  trust_score integer not null default 0 check (trust_score between 0 and 100),
  total_score integer not null default 0 check (total_score between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.analyst_applications enable row level security;
alter table public.analyst_scores enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update own profile except role"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "published posts are readable by everyone"
  on public.posts for select
  using (status = 'published');

create policy "authenticated users can write posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "authors can update own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "authors can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create policy "users can create own analyst application"
  on public.analyst_applications for insert
  with check (
    auth.uid() = user_id
    and no_investment_advice_agreed = true
    and risk_disclosure_agreed = true
  );

create policy "users can read own analyst applications"
  on public.analyst_applications for select
  using (auth.uid() = user_id);

create policy "analyst scores are readable by everyone"
  on public.analyst_scores for select
  using (true);

-- Admin-only review/status and role changes should be performed through
-- service-role server actions or edge functions that verify an admin profile.
-- Payment and revenue settlement are intentionally not implemented here:
-- production payouts require a payment provider, webhook verification,
-- tax/KYC workflow, legal terms, and auditable ledger tables.
