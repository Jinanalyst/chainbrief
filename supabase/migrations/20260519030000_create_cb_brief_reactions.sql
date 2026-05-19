-- Brief reaction funnel: Brief → Bull/Bear Opinion → Community Discussion → Analyst Score
-- All values are persisted live; analyst score is computed on read from these tables.

create table if not exists cb_brief_reactions (
  id            uuid primary key default gen_random_uuid(),
  brief_id      text not null,                 -- Article.id / slug (RSS-sourced)
  user_id       uuid not null,                 -- auth.users.id
  reaction      text not null check (reaction in ('bullish','bearish','neutral','need_more_data')),
  reasoning     text,                          -- short reasoning written after reacting
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (brief_id, user_id)
);

create index if not exists cb_brief_reactions_brief_idx on cb_brief_reactions (brief_id);
create index if not exists cb_brief_reactions_user_idx  on cb_brief_reactions (user_id);

create table if not exists cb_brief_views (
  id          uuid primary key default gen_random_uuid(),
  brief_id    text not null,
  user_id     uuid,                            -- nullable for anon
  viewed_at   timestamptz not null default now()
);

create index if not exists cb_brief_views_brief_idx on cb_brief_views (brief_id);

create table if not exists cb_brief_comments (
  id          uuid primary key default gen_random_uuid(),
  brief_id    text not null,
  user_id     uuid not null,
  parent_id   uuid references cb_brief_comments(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists cb_brief_comments_brief_idx on cb_brief_comments (brief_id);

create table if not exists cb_brief_saves (
  id          uuid primary key default gen_random_uuid(),
  brief_id    text not null,
  user_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (brief_id, user_id)
);

create table if not exists cb_brief_likes (
  id          uuid primary key default gen_random_uuid(),
  brief_id    text not null,
  user_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (brief_id, user_id)
);

-- RLS
alter table cb_brief_reactions enable row level security;
alter table cb_brief_views     enable row level security;
alter table cb_brief_comments  enable row level security;
alter table cb_brief_saves     enable row level security;
alter table cb_brief_likes     enable row level security;

-- Readable to all (aggregates are public)
drop policy if exists cb_brief_reactions_read on cb_brief_reactions;
create policy cb_brief_reactions_read on cb_brief_reactions for select using (true);
drop policy if exists cb_brief_views_read on cb_brief_views;
create policy cb_brief_views_read on cb_brief_views for select using (true);
drop policy if exists cb_brief_comments_read on cb_brief_comments;
create policy cb_brief_comments_read on cb_brief_comments for select using (true);
drop policy if exists cb_brief_saves_read on cb_brief_saves;
create policy cb_brief_saves_read on cb_brief_saves for select using (true);
drop policy if exists cb_brief_likes_read on cb_brief_likes;
create policy cb_brief_likes_read on cb_brief_likes for select using (true);

-- Writes: only the owner can insert/update/delete their own row
drop policy if exists cb_brief_reactions_write on cb_brief_reactions;
create policy cb_brief_reactions_write on cb_brief_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cb_brief_views_write on cb_brief_views;
create policy cb_brief_views_write on cb_brief_views
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists cb_brief_comments_write on cb_brief_comments;
create policy cb_brief_comments_write on cb_brief_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cb_brief_saves_write on cb_brief_saves;
create policy cb_brief_saves_write on cb_brief_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cb_brief_likes_write on cb_brief_likes;
create policy cb_brief_likes_write on cb_brief_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live aggregate view for a brief: bull/bear/neutral/need-more-data counts + percentages
create or replace view cb_brief_sentiment as
select
  r.brief_id,
  count(*) filter (where reaction = 'bullish')        as bullish_count,
  count(*) filter (where reaction = 'bearish')        as bearish_count,
  count(*) filter (where reaction = 'neutral')        as neutral_count,
  count(*) filter (where reaction = 'need_more_data') as need_more_count,
  count(*)                                            as total_count
from cb_brief_reactions r
group by r.brief_id;

-- Per-user analyst score, computed live on read.
-- Components (each 0..100):
--   engagement  : how much community interaction the user generates (likes + comments + saves received)
--   consistency : ratio of reactions backed by reasoning (>= 20 chars) — proxy for prediction discipline
--   risk_aware  : fraction of reasoning that mentions risk language
--   trust       : likes received on their reactions / comments by other users
create or replace view cb_analyst_live_scores as
with
  user_reactions as (
    select user_id,
           count(*)                                                         as reactions_total,
           count(*) filter (where length(coalesce(reasoning, '')) >= 20)    as reactions_reasoned,
           count(*) filter (
             where reasoning ~* '\m(risk|liquid|drawdown|stoploss|stop loss|leverage|위험|손절|리스크|변동성)\M'
           )                                                                 as reactions_risk_aware
    from cb_brief_reactions
    group by user_id
  ),
  user_comments as (
    select user_id, count(*) as comments_total
    from cb_brief_comments
    group by user_id
  ),
  trust_received as (
    -- approx community trust: likes received on the user's brief_comments
    select c.user_id, count(l.id) as likes_received
    from cb_brief_comments c
    left join cb_brief_likes l on l.brief_id = c.brief_id
    group by c.user_id
  )
select
  u.user_id,
  least(100, coalesce(uc.comments_total, 0) * 4 + coalesce(ur.reactions_total, 0) * 2)              as engagement_score,
  case when coalesce(ur.reactions_total, 0) = 0 then 0
       else least(100, round(100.0 * ur.reactions_reasoned / ur.reactions_total)) end               as consistency_score,
  case when coalesce(ur.reactions_total, 0) = 0 then 0
       else least(100, round(100.0 * ur.reactions_risk_aware / ur.reactions_total)) end             as risk_score,
  least(100, coalesce(tr.likes_received, 0) * 5)                                                    as trust_score,
  -- total = weighted average
  least(100, round(
    (least(100, coalesce(uc.comments_total, 0) * 4 + coalesce(ur.reactions_total, 0) * 2) * 0.25) +
    (case when coalesce(ur.reactions_total, 0) = 0 then 0
          else least(100, 100.0 * ur.reactions_reasoned / ur.reactions_total) end * 0.30) +
    (case when coalesce(ur.reactions_total, 0) = 0 then 0
          else least(100, 100.0 * ur.reactions_risk_aware / ur.reactions_total) end * 0.20) +
    (least(100, coalesce(tr.likes_received, 0) * 5) * 0.25)
  ))                                                                                                 as total_score
from (
  select user_id from cb_brief_reactions
  union
  select user_id from cb_brief_comments
) u
left join user_reactions  ur on ur.user_id = u.user_id
left join user_comments   uc on uc.user_id = u.user_id
left join trust_received  tr on tr.user_id = u.user_id;
