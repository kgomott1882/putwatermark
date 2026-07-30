-- Fill-text exports upload a temporary JSON manifest for server-side credit checks.
update storage.buckets
set allowed_mime_types = array[
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/png',
  'application/pdf',
  'application/json'
]
where id = 'watermark-temp';
