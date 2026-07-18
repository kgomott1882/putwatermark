create table public.export_authorizations (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  file_type text not null,
  decision text not null check (decision in ('clean', 'watermarked')),
  reason text,
  cost bigint not null,
  balance_at_check bigint,
  ip_address text,
  created_at timestamptz not null default now()
);

create index export_authorizations_user_id_created_at_idx
  on public.export_authorizations (user_id, created_at);

create index export_authorizations_ip_address_created_at_idx
  on public.export_authorizations (ip_address, created_at);

alter table public.export_authorizations enable row level security;

-- No policies: service-role only. Authenticated and anon clients cannot read or write.
