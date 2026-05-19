alter table public.posts
  add column if not exists quoted_post_id uuid references public.posts(id) on delete cascade,
  add column if not exists quote_kind text check (quote_kind in ('rebrief', 'quote_analysis'));

alter table public.post_comments
  add column if not exists parent_comment_id uuid references public.post_comments(id) on delete cascade;

create index if not exists posts_quoted_post_id_idx on public.posts (quoted_post_id, quote_kind, created_at desc);
create index if not exists posts_coin_tags_gin_idx on public.posts using gin (coin_tags);
create index if not exists post_comments_parent_comment_id_idx on public.post_comments (parent_comment_id, created_at asc);

drop policy if exists "published post likes are readable" on public.post_likes;
create policy "published post likes are readable"
  on public.post_likes for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.status = 'published'
    )
  );

drop policy if exists "published post bookmarks are readable" on public.post_bookmarks;
create policy "published post bookmarks are readable"
  on public.post_bookmarks for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.status = 'published'
    )
  );

drop policy if exists "published post reactions are readable" on public.post_reactions;
create policy "published post reactions are readable"
  on public.post_reactions for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.status = 'published'
    )
  );

drop policy if exists "published post views are readable" on public.post_views;
create policy "published post views are readable"
  on public.post_views for select
  using (
    exists (
      select 1 from public.posts posts
      where posts.id = post_id and posts.status = 'published'
    )
  );

grant select on public.post_views, public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to anon, authenticated;
grant insert on public.post_views to anon, authenticated;
grant insert on public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to authenticated;
grant update on public.post_comments, public.post_reactions to authenticated;
grant delete on public.post_likes, public.post_bookmarks, public.post_comments, public.post_reactions to authenticated;

notify pgrst, 'reload schema';
