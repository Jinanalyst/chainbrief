-- Storage bucket for images / videos embedded in Insights posts.
-- Public read, authenticated write. Upload route additionally checks
-- isInsightAuthor() before allowing any insert.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'insights-media',
  'insights-media',
  true,
  104857600, -- 100 MB
  array[
    'image/jpeg','image/jpg','image/png','image/gif','image/webp','image/avif',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read insights media" on storage.objects;
create policy "Public read insights media"
  on storage.objects for select
  using (bucket_id = 'insights-media');

drop policy if exists "Authenticated upload insights media" on storage.objects;
create policy "Authenticated upload insights media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'insights-media');

drop policy if exists "Authenticated update insights media" on storage.objects;
create policy "Authenticated update insights media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'insights-media');

drop policy if exists "Authenticated delete insights media" on storage.objects;
create policy "Authenticated delete insights media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'insights-media');
