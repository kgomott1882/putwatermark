-- Private scratch bucket for temporary server-side watermark processing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'watermark-temp',
  'watermark-temp',
  false,
  262144000,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
