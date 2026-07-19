-- Returns whether an auth user exists for this email and whether they confirmed it.
create or replace function public.check_user_email_status(check_email text)
returns jsonb
language sql
stable
security definer
set search_path = auth, public
as $$
  select jsonb_build_object(
    'exists',
    exists (
      select 1
      from auth.users
      where lower(trim(email)) = lower(trim(check_email))
    ),
    'confirmed',
    coalesce(
      (
        select email_confirmed_at is not null
        from auth.users
        where lower(trim(email)) = lower(trim(check_email))
        limit 1
      ),
      false
    )
  );
$$;

revoke all on function public.check_user_email_status(text) from public;
grant execute on function public.check_user_email_status(text) to service_role;
