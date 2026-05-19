-- Stash extra CommunityPost fields (stance, discussionType, analystTier override,
-- article hints, snapshot of quoted post, etc.) in a jsonb column so the post
-- round-trips fully through Supabase without one column per field.
alter table public.posts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Image / video attachments for community posts.
create table if not exists public.post_attachments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  kind        text not null check (kind in ('image','video')),
  name        text,
  mime_type   text,
  data_url    text not null,
  size        integer,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists post_attachments_post_id_idx
  on public.post_attachments (post_id, position);

alter table public.post_attachments enable row level security;

drop policy if exists post_attachments_read on public.post_attachments;
create policy post_attachments_read on public.post_attachments
  for select using (true);

-- Only the post's author can write/delete its attachments.
drop policy if exists post_attachments_write on public.post_attachments;
create policy post_attachments_write on public.post_attachments
  for all using (
    exists (
      select 1 from public.posts p
      where p.id = post_attachments.post_id and p.author_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.posts p
      where p.id = post_attachments.post_id and p.author_id = auth.uid()
    )
  );
