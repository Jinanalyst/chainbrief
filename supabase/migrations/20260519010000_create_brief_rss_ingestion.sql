create table if not exists public.brief_articles (
  id text primary key,
  slug text not null,
  title text not null,
  summary text,
  ai_summary text,
  source_id text not null,
  source_name text not null,
  category text not null,
  published_at timestamptz not null,
  thumbnail_url text,
  original_url text not null,
  tags text[] not null default '{}',
  market_impact text not null default 'Neutral' check (market_impact in ('Bullish', 'Bearish', 'Neutral')),
  raw_content_snippet text,
  feed_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (original_url)
);

create table if not exists public.brief_article_reactions (
  id uuid primary key default gen_random_uuid(),
  article_id text not null references public.brief_articles(id) on delete cascade,
  visitor_id text not null,
  reaction text not null check (reaction in ('bull', 'bear')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, visitor_id)
);

create index if not exists brief_articles_category_published_at_idx
  on public.brief_articles (category, published_at desc);

create index if not exists brief_articles_source_id_idx
  on public.brief_articles (source_id);

create index if not exists brief_articles_tags_gin_idx
  on public.brief_articles using gin (tags);

create index if not exists brief_article_reactions_article_id_reaction_idx
  on public.brief_article_reactions (article_id, reaction);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brief_articles_updated_at on public.brief_articles;
create trigger set_brief_articles_updated_at
  before update on public.brief_articles
  for each row execute function public.set_updated_at();

drop trigger if exists set_brief_article_reactions_updated_at on public.brief_article_reactions;
create trigger set_brief_article_reactions_updated_at
  before update on public.brief_article_reactions
  for each row execute function public.set_updated_at();

create or replace view public.brief_articles_with_reactions
with (security_invoker = true)
as
select
  articles.*,
  count(reactions.id) filter (where reactions.reaction = 'bull')::integer as bull_count,
  count(reactions.id) filter (where reactions.reaction = 'bear')::integer as bear_count
from public.brief_articles articles
left join public.brief_article_reactions reactions
  on reactions.article_id = articles.id
group by articles.id;

alter table public.brief_articles enable row level security;
alter table public.brief_article_reactions enable row level security;

drop policy if exists "brief articles are readable" on public.brief_articles;
create policy "brief articles are readable"
  on public.brief_articles for select
  to anon, authenticated
  using (true);

drop policy if exists "brief reactions are readable" on public.brief_article_reactions;
create policy "brief reactions are readable"
  on public.brief_article_reactions for select
  to anon, authenticated
  using (true);

grant select on public.brief_articles to anon, authenticated;
grant select on public.brief_articles_with_reactions to anon, authenticated;
grant select on public.brief_article_reactions to anon, authenticated;

notify pgrst, 'reload schema';
