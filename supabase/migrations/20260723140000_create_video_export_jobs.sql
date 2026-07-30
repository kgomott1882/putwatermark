-- Long-video export job tracking + raise watermark-temp object size limit.

update storage.buckets
set file_size_limit = 2147483648
where id = 'watermark-temp';

create table if not exists public.video_export_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  export_id uuid,
  status text not null check (
    status in (
      'uploaded',
      'splitting',
      'split_complete',
      'processing',
      'concatenating',
      'ready',
      'failed'
    )
  ),
  input_path text not null,
  input_file_name text not null,
  output_path text,
  duration_seconds numeric,
  file_size_bytes bigint,
  split_at_seconds numeric[] not null default '{}',
  chunk_count integer not null default 0,
  chunks jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_export_jobs_user_id_idx
  on public.video_export_jobs (user_id);

create index if not exists video_export_jobs_status_idx
  on public.video_export_jobs (status);

alter table public.video_export_jobs enable row level security;

create policy "Users can read own video export jobs"
  on public.video_export_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);
