-- Ensure profile rows are always created on signup, even if metadata is missing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, surname, marketing_consent)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'User'),
    coalesce(nullif(trim(new.raw_user_meta_data->>'surname'), ''), 'Member'),
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    surname = excluded.surname,
    marketing_consent = excluded.marketing_consent;

  return new;
end;
$$;

-- Backfill profiles for auth users that were created before the trigger ran correctly.
insert into public.profiles (id, name, surname, marketing_consent)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data->>'name'), ''), 'User'),
  coalesce(nullif(trim(users.raw_user_meta_data->>'surname'), ''), 'Member'),
  coalesce((users.raw_user_meta_data->>'marketing_consent')::boolean, false)
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;
