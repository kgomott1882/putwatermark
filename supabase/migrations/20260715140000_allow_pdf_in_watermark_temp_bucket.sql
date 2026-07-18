-- PDF exports upload to watermark-temp for server-side page-count verification.
update storage.buckets
set allowed_mime_types = array[
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/png',
  'application/pdf'
]
where id = 'watermark-temp';
