-- Allow scheduled publishing for insights.
-- 'scheduled' rows carry a future published_at; once that time arrives the row
-- is treated as published by API/listings (no cron required — checks happen at
-- read time).

alter table public.cb_insights
  drop constraint if exists cb_insights_status_check;

alter table public.cb_insights
  add constraint cb_insights_status_check
  check (status in ('draft', 'published', 'scheduled'));

-- Public can read scheduled rows whose time has arrived.
drop policy if exists "Public can read due scheduled insights" on public.cb_insights;
create policy "Public can read due scheduled insights"
  on public.cb_insights
  for select
  using (status = 'scheduled' and published_at is not null and published_at <= now());
