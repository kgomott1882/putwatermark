-- Anonymous export drafts: preserve editor state across login/signup.
create table if not exists public.anonymous_export_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  media_kind text not null check (media_kind in ('image', 'pdf', 'video')),
  state_json jsonb not null default '{}'::jsonb,
  storage_paths text[] not null default '{}',
  expires_at timestamptz not null,
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anonymous_export_drafts_expires_at_idx
  on public.anonymous_export_drafts (expires_at);

create index if not exists anonymous_export_drafts_session_id_idx
  on public.anonymous_export_drafts (session_id);

alter table public.anonymous_export_drafts enable row level security;

-- Service role only; all access goes through Next.js API routes.
revoke all on table public.anonymous_export_drafts from anon, authenticated;
grant all on table public.anonymous_export_drafts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anonymous-drafts',
  'anonymous-drafts',
  false,
  262144000,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
