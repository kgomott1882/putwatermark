create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  surname text not null,
  marketing_consent boolean not null default false,
  billing_country text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Profiles are created via a trigger on auth.users signup, not direct
-- insert from the client, so no insert policy for authenticated users.

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, surname, marketing_consent)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'surname',
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
