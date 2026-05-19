-- Engagement on community posts (reposts/shares). Likes/comments/saves/reactions/views
-- reuse cb_brief_* tables since brief_id is text and community post id is also text.

create table if not exists cb_post_reposts (
  id          uuid primary key default gen_random_uuid(),
  post_id     text not null,
  user_id     uuid not null,
  body        text,                              -- optional quote body
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists cb_post_reposts_post_idx on cb_post_reposts (post_id);

create table if not exists cb_post_shares (
  id          uuid primary key default gen_random_uuid(),
  post_id     text not null,
  user_id     uuid,
  channel     text,                              -- "copy" | "twitter" | "kakao" | ...
  created_at  timestamptz not null default now()
);

create index if not exists cb_post_shares_post_idx on cb_post_shares (post_id);

alter table cb_post_reposts enable row level security;
alter table cb_post_shares  enable row level security;

drop policy if exists cb_post_reposts_read on cb_post_reposts;
create policy cb_post_reposts_read on cb_post_reposts for select using (true);
drop policy if exists cb_post_reposts_write on cb_post_reposts;
create policy cb_post_reposts_write on cb_post_reposts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cb_post_shares_read on cb_post_shares;
create policy cb_post_shares_read on cb_post_shares for select using (true);
drop policy if exists cb_post_shares_write on cb_post_shares;
create policy cb_post_shares_write on cb_post_shares
  for insert with check (user_id is null or auth.uid() = user_id);

-- Per-post quality score. Posts with reasoning, invalidation level, and risk disclosure
-- get higher quality scores. Used as input to a user's overall analyst score.
create or replace view cb_post_quality as
select
  c.post_id,
  -- length signal: reasoned arguments tend to be longer
  least(100, round(avg(length(coalesce(c.body, ''))) / 4))                                        as reasoning_score,
  -- presence of explicit invalidation level (e.g., "invalid below", "손절", "stop")
  case when count(*) filter (
         where c.body ~* '\m(invalid|invalidation|stop loss|stoploss|손절|무효화)\M'
       ) > 0 then 100 else 0 end                                                                   as invalidation_score,
  -- risk disclosure language
  case when count(*) filter (
         where c.body ~* '\m(risk|drawdown|leverage|위험|리스크|변동성)\M'
       ) > 0 then 100 else 0 end                                                                   as risk_disclosure_score
from cb_brief_comments c
group by c.post_id;

-- Refined per-user analyst score that combines reaction discipline + post quality + community trust.
create or replace view cb_analyst_user_score as
with
  reactions as (
    select user_id,
           count(*)                                                       as total,
           count(*) filter (where length(coalesce(reasoning,'')) >= 20)   as reasoned,
           count(*) filter (
             where reasoning ~* '\m(risk|liquid|drawdown|stoploss|stop loss|leverage|위험|손절|리스크|변동성)\M'
           )                                                               as risk_aware,
           count(*) filter (
             where reasoning ~* '\m(invalid|invalidation|손절|무효화)\M'
           )                                                               as invalidation
    from cb_brief_reactions
    group by user_id
  ),
  engagement as (
    select uid as user_id, sum(likes) as likes, sum(comments) as comments,
           sum(saves) as saves, sum(reposts) as reposts, sum(shares) as shares,
           sum(views) as views
    from (
      select user_id as uid, count(*) as likes, 0 as comments, 0 as saves, 0 as reposts, 0 as shares, 0 as views from cb_brief_likes group by user_id
      union all
      select user_id, 0, count(*), 0, 0, 0, 0 from cb_brief_comments group by user_id
      union all
      select user_id, 0, 0, count(*), 0, 0, 0 from cb_brief_saves group by user_id
      union all
      select user_id, 0, 0, 0, count(*), 0, 0 from cb_post_reposts group by user_id
      union all
      select coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), 0, 0, 0, 0, count(*), 0 from cb_post_shares group by user_id
      union all
      select coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), 0, 0, 0, 0, 0, count(*) from cb_brief_views group by user_id
    ) s
    group by uid
  )
select
  u.user_id,
  -- engagement_score: caps so a single super-popular post can't dominate
  least(100, coalesce(e.likes,0) * 3 + coalesce(e.comments,0) * 4
              + coalesce(e.saves,0) * 4 + coalesce(e.reposts,0) * 6
              + coalesce(e.shares,0) * 3 + coalesce(e.views,0) * 0.05)         as engagement_score,
  -- consistency: % of stances backed by reasoning
  case when coalesce(r.total,0) = 0 then 0
       else least(100, round(100.0 * r.reasoned / r.total)) end                 as consistency_score,
  -- risk_aware writing
  case when coalesce(r.total,0) = 0 then 0
       else least(100, round(100.0 * r.risk_aware / r.total)) end               as risk_score,
  -- prediction discipline (uses invalidation levels)
  case when coalesce(r.total,0) = 0 then 0
       else least(100, round(100.0 * r.invalidation / r.total)) end             as invalidation_score,
  -- community trust = likes received on their comments + reposts received
  least(100,
    coalesce((select count(*) from cb_brief_likes l
              join cb_brief_comments c on c.brief_id = l.brief_id and c.user_id = u.user_id), 0) * 5
    + coalesce((select count(*) from cb_post_reposts pr
                join cb_brief_comments c2 on c2.user_id = u.user_id and c2.brief_id = pr.post_id), 0) * 10
  )                                                                              as trust_score,
  -- final score = weighted blend
  least(100, round(
    (least(100, coalesce(e.likes,0) * 3 + coalesce(e.comments,0) * 4
              + coalesce(e.saves,0) * 4 + coalesce(e.reposts,0) * 6
              + coalesce(e.shares,0) * 3 + coalesce(e.views,0) * 0.05) * 0.25)
    + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.reasoned / r.total) end * 0.25)
    + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.risk_aware / r.total) end * 0.15)
    + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.invalidation / r.total) end * 0.15)
    + (least(100,
        coalesce((select count(*) from cb_brief_likes l
                  join cb_brief_comments c on c.brief_id = l.brief_id and c.user_id = u.user_id), 0) * 5
      ) * 0.20)
  ))                                                                              as total_score,
  -- classification tiers
  case
    when least(100, round(
      (least(100, coalesce(e.likes,0) * 3 + coalesce(e.comments,0) * 4
                + coalesce(e.saves,0) * 4 + coalesce(e.reposts,0) * 6
                + coalesce(e.shares,0) * 3 + coalesce(e.views,0) * 0.05) * 0.25)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.reasoned / r.total) end * 0.25)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.risk_aware / r.total) end * 0.15)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.invalidation / r.total) end * 0.15)
    )) >= 75 then 'verified_analyst'
    when least(100, round(
      (least(100, coalesce(e.likes,0) * 3 + coalesce(e.comments,0) * 4
                + coalesce(e.saves,0) * 4 + coalesce(e.reposts,0) * 6
                + coalesce(e.shares,0) * 3 + coalesce(e.views,0) * 0.05) * 0.25)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.reasoned / r.total) end * 0.25)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.risk_aware / r.total) end * 0.15)
      + (case when coalesce(r.total,0) = 0 then 0 else least(100, 100.0 * r.invalidation / r.total) end * 0.15)
    )) >= 40 then 'rising_analyst'
    else 'rookie_analyst'
  end                                                                              as tier
from (
  select user_id from cb_brief_reactions
  union
  select user_id from cb_brief_comments
  union
  select user_id from cb_post_reposts
) u
left join reactions  r on r.user_id = u.user_id
left join engagement e on e.user_id = u.user_id;
