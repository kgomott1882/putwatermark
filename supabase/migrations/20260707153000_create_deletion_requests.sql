create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  sla_due_at timestamptz not null default (now() + interval '30 days'),
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed'))
);

create unique index deletion_requests_one_pending_per_user
  on public.deletion_requests (user_id)
  where status = 'pending';

alter table public.deletion_requests enable row level security;

create policy "Users can view own deletion requests"
  on public.deletion_requests for select
  using (auth.uid() = user_id);

create policy "Users can create own deletion request"
  on public.deletion_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own pending deletion request"
  on public.deletion_requests for delete
  using (auth.uid() = user_id and status = 'pending');
