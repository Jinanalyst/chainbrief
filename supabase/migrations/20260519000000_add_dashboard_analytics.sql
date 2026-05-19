create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  session_id text,
  viewed_at timestamptz not null default now(),
  check (viewer_id is not null or session_id is not null)
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('bull', 'bear')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_views_post_id_viewed_at_idx on public.post_views (post_id, viewed_at desc);
create index if not exists post_views_viewer_id_idx on public.post_views (viewer_id);
create index if not exists post_views_session_id_idx on public.post_views (session_id);
create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists post_bookmarks_post_id_idx on public.post_bookmarks (post_id);
create index if not exists post_comments_post_id_created_at_idx on public.post_comments (post_id, created_at desc);
create index if not exists post_reactions_post_id_reaction_idx on public.post_reactions (post_id, reaction);

alter table public.post_views enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;

drop policy if exists "authors can read post views" on public.post_views;
create policy "authors can read post views"
  on public.post_views for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.author_id = auth.uid()
    )
    or viewer_id = auth.uid()
  );

drop policy if exists "users can record post views" on public.post_views;
create policy "users can record post views"
  on public.post_views for insert
  with check (viewer_id = auth.uid() or viewer_id is null);

drop policy if exists "authors and users can read post likes" on public.post_likes;
create policy "authors and users can read post likes"
  on public.post_likes for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.author_id = auth.uid()
    )
  );

drop policy if exists "users can like posts" on public.post_likes;
create policy "users can like posts"
  on public.post_likes for insert
  with check (user_id = auth.uid());

drop policy if exists "users can remove own likes" on public.post_likes;
create policy "users can remove own likes"
  on public.post_likes for delete
  using (user_id = auth.uid());

drop policy if exists "authors and users can read post bookmarks" on public.post_bookmarks;
create policy "authors and users can read post bookmarks"
  on public.post_bookmarks for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.author_id = auth.uid()
    )
  );

drop policy if exists "users can bookmark posts" on public.post_bookmarks;
create policy "users can bookmark posts"
  on public.post_bookmarks for insert
  with check (user_id = auth.uid());

drop policy if exists "users can remove own bookmarks" on public.post_bookmarks;
create policy "users can remove own bookmarks"
  on public.post_bookmarks for delete
  using (user_id = auth.uid());

drop policy if exists "published post comments are readable" on public.post_comments;
create policy "published post comments are readable"
  on public.post_comments for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.status = 'published'
    )
  );

drop policy if exists "users can comment on posts" on public.post_comments;
create policy "users can comment on posts"
  on public.post_comments for insert
  with check (user_id = auth.uid());

drop policy if exists "users can update own comments" on public.post_comments;
create policy "users can update own comments"
  on public.post_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can delete own comments" on public.post_comments;
create policy "users can delete own comments"
  on public.post_comments for delete
  using (user_id = auth.uid());

drop policy if exists "authors and users can read post reactions" on public.post_reactions;
create policy "authors and users can read post reactions"
  on public.post_reactions for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.author_id = auth.uid()
    )
  );

drop policy if exists "users can react to posts" on public.post_reactions;
create policy "users can react to posts"
  on public.post_reactions for insert
  with check (user_id = auth.uid());

drop policy if exists "users can update own reactions" on public.post_reactions;
create policy "users can update own reactions"
  on public.post_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can remove own reactions" on public.post_reactions;
create policy "users can remove own reactions"
  on public.post_reactions for delete
  using (user_id = auth.uid());

grant insert on public.post_views, public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to authenticated;
grant select on public.post_views, public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to authenticated;
grant update on public.post_comments, public.post_reactions to authenticated;
grant delete on public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to authenticated;

revoke all on public.post_views from anon;
revoke all on public.post_likes from anon;
revoke all on public.post_bookmarks from anon;
revoke all on public.post_comments from anon;
revoke all on public.post_reactions from anon;

notify pgrst, 'reload schema';
