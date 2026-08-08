-- Parse Google OAuth and email signup metadata into profile name/surname fields.
create or replace function public.profile_names_from_metadata(meta jsonb)
returns table(first_name text, last_name text)
language plpgsql
immutable
as $$
declare
  meta_name text;
  meta_surname text;
  meta_given text;
  meta_family text;
  meta_full text;
  space_pos int;
begin
  meta_name := nullif(trim(meta->>'name'), '');
  meta_surname := nullif(trim(meta->>'surname'), '');

  if meta_name is not null and meta_surname is not null then
    first_name := meta_name;
    last_name := meta_surname;
    return next;
  end if;

  meta_given := nullif(trim(meta->>'given_name'), '');
  meta_family := nullif(trim(meta->>'family_name'), '');

  if meta_given is not null then
    first_name := meta_given;
    last_name := coalesce(meta_family, meta_surname, 'Member');
    return next;
  end if;

  meta_full := coalesce(
    nullif(trim(meta->>'full_name'), ''),
    meta_name
  );

  if meta_full is not null then
    space_pos := strpos(meta_full, ' ');
    if space_pos > 0 then
      first_name := trim(substring(meta_full from 1 for space_pos - 1));
      last_name := trim(substring(meta_full from space_pos + 1));
    else
      first_name := meta_full;
      last_name := coalesce(meta_surname, meta_family, 'Member');
    end if;
    return next;
  end if;

  first_name := coalesce(meta_name, 'User');
  last_name := coalesce(meta_surname, meta_family, 'Member');
  return next;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_names record;
begin
  select *
  into profile_names
  from public.profile_names_from_metadata(new.raw_user_meta_data);

  insert into public.profiles (id, name, surname, marketing_consent)
  values (
    new.id,
    profile_names.first_name,
    profile_names.last_name,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    surname = excluded.surname,
    marketing_consent = excluded.marketing_consent;

  return new;
end;
$$;

-- Backfill Google OAuth users that received generic placeholder names.
update public.profiles as profiles
set
  name = names.first_name,
  surname = names.last_name
from auth.users as users
cross join lateral public.profile_names_from_metadata(users.raw_user_meta_data) as names
where profiles.id = users.id
  and profiles.name = 'User'
  and profiles.surname = 'Member'
  and (
    nullif(trim(users.raw_user_meta_data->>'full_name'), '') is not null
    or nullif(trim(users.raw_user_meta_data->>'given_name'), '') is not null
    or (
      nullif(trim(users.raw_user_meta_data->>'name'), '') is not null
      and nullif(trim(users.raw_user_meta_data->>'surname'), '') is null
      and strpos(trim(users.raw_user_meta_data->>'name'), ' ') > 0
    )
  );
