-- Profile follows: lets a user follow another profile (analyst or creator).
-- Used to power the Library "Followed analysts" tab and a Follow button next
-- to author names on community posts.

create table if not exists public.profile_follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  followed_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists profile_follows_follower_idx on public.profile_follows (follower_id);
create index if not exists profile_follows_followed_idx on public.profile_follows (followed_id);

alter table public.profile_follows enable row level security;

drop policy if exists "profile_follows readable by everyone" on public.profile_follows;
create policy "profile_follows readable by everyone"
  on public.profile_follows for select
  using (true);

drop policy if exists "users can follow others" on public.profile_follows;
create policy "users can follow others"
  on public.profile_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.profile_follows;
create policy "users can unfollow"
  on public.profile_follows for delete
  using (auth.uid() = follower_id);

grant select on public.profile_follows to anon, authenticated;
grant insert, delete on public.profile_follows to authenticated;

notify pgrst, 'reload schema';
