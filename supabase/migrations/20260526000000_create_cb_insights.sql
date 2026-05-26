-- Insights: long-form author posts (categorised blog) for chainbrief.kr
-- Categories are constrained to the four sections shown in the UI.

create table if not exists public.cb_insights (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  category text not null check (category in ('education', 'crypto', 'stocks', 'macro')),
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cb_insights_category_idx on public.cb_insights (category);
create index if not exists cb_insights_status_published_idx
  on public.cb_insights (status, published_at desc);
create index if not exists cb_insights_author_idx on public.cb_insights (author_id);

create or replace function public.cb_insights_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cb_insights_set_updated_at on public.cb_insights;
create trigger cb_insights_set_updated_at
  before update on public.cb_insights
  for each row execute function public.cb_insights_set_updated_at();

alter table public.cb_insights enable row level security;

-- Anyone (including anon) can read published insights.
drop policy if exists "Public can read published insights" on public.cb_insights;
create policy "Public can read published insights"
  on public.cb_insights
  for select
  using (status = 'published');

-- The author can read their own drafts too.
drop policy if exists "Authors read own insights" on public.cb_insights;
create policy "Authors read own insights"
  on public.cb_insights
  for select
  to authenticated
  using (author_id = auth.uid());

-- Only the author of the row can insert / update / delete.
drop policy if exists "Authors write own insights" on public.cb_insights;
create policy "Authors write own insights"
  on public.cb_insights
  for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Authors update own insights" on public.cb_insights;
create policy "Authors update own insights"
  on public.cb_insights
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Authors delete own insights" on public.cb_insights;
create policy "Authors delete own insights"
  on public.cb_insights
  for delete
  to authenticated
  using (author_id = auth.uid());
