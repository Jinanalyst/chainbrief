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
create type public.chainbrief_membership_status as enum ('active', 'cancelled');
create type public.chainbrief_revenue_event_type as enum ('subscription', 'tip');
create type public.chainbrief_experience_years as enum ('lt_1', '1_3', '3_5', '5_plus');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  bio text,
  role public.chainbrief_role not null default 'user',
  analyst_score integer not null default 0 check (analyst_score between 0 and 100),
  analyst_membership_enabled boolean not null default false,
  analyst_membership_price_usd numeric(10,2) not null default 1,
  analyst_membership_description text,
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
  full_name text not null,
  twitter_handle text,
  expertise_areas text[] not null default '{}',
  experience_years public.chainbrief_experience_years not null default 'lt_1',
  expertise text not null,
  bio text not null,
  sample_content text,
  sample_url text,
  motivation text,
  markets text[] not null default '{}',
  no_investment_advice_agreed boolean not null default false,
  risk_disclosure_agreed boolean not null default false,
  status public.chainbrief_application_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  applied_at timestamptz not null default now()
);

create table if not exists public.analyst_memberships (
  id uuid primary key default gen_random_uuid(),
  analyst_id uuid not null references public.profiles(id) on delete cascade,
  subscriber_user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  cancelled_at timestamptz,
  status public.chainbrief_membership_status not null default 'active'
);

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  analyst_id uuid not null references public.profiles(id) on delete cascade,
  type public.chainbrief_revenue_event_type not null,
  amount numeric(10,2) not null check (amount >= 0),
  source_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
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

create table if not exists public.analyst_profiles (
  analyst_id uuid primary key references public.profiles(id) on delete cascade,
  membership_enabled boolean not null default false,
  membership_price_usd numeric(10,2) not null default 1,
  membership_description text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.analyst_posts (
  id uuid primary key default gen_random_uuid(),
  analyst_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.chainbrief_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.chainbrief_handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.analyst_applications enable row level security;
alter table public.analyst_memberships enable row level security;
alter table public.revenue_events enable row level security;
alter table public.analyst_scores enable row level security;
alter table public.analyst_profiles enable row level security;
alter table public.analyst_posts enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users can insert own profile row"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'user');

create policy "admin can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

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

create policy "admin can read analyst applications"
  on public.analyst_applications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admin can update analyst applications"
  on public.analyst_applications for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "memberships readable by analyst and member"
  on public.analyst_memberships for select
  using (auth.uid() = analyst_id or auth.uid() = subscriber_user_id);

create policy "analysts can manage own memberships"
  on public.analyst_memberships for update
  using (auth.uid() = analyst_id)
  with check (auth.uid() = analyst_id);

create policy "analysts can read own revenue events"
  on public.revenue_events for select
  using (auth.uid() = analyst_id);

create policy "analysts can insert own revenue events"
  on public.revenue_events for insert
  with check (auth.uid() = analyst_id);

create policy "analyst scores are readable by everyone"
  on public.analyst_scores for select
  using (true);

create policy "analyst posts are readable by everyone"
  on public.analyst_posts for select
  using (true);

create policy "analysts can manage own analyst posts"
  on public.analyst_posts for all
  using (auth.uid() = analyst_id)
  with check (auth.uid() = analyst_id);

create policy "analyst profiles readable by everyone"
  on public.analyst_profiles for select
  using (true);

create policy "owners can insert analyst profiles"
  on public.analyst_profiles for insert
  with check (auth.uid() = analyst_id);

create policy "owners can manage analyst profiles"
  on public.analyst_profiles for all
  using (auth.uid() = analyst_id)
  with check (auth.uid() = analyst_id);

-- Admin-only review/status and role changes are handled through server actions
-- that verify the caller's profile.role = 'admin'.
