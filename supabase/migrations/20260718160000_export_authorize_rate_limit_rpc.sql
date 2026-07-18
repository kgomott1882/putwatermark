-- Atomically enforce export authorize rate limits under concurrent requests.
create or replace function public.try_insert_export_authorization(
  p_export_id uuid,
  p_user_id uuid,
  p_file_type text,
  p_decision text,
  p_reason text,
  p_cost bigint,
  p_balance_at_check bigint,
  p_ip_address text,
  p_limit integer default 10,
  p_window_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count bigint;
begin
  if p_user_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  elsif p_ip_address is not null and length(trim(p_ip_address)) > 0 then
    perform pg_advisory_xact_lock(hashtext(trim(p_ip_address)));
  else
    return;
  end if;

  select count(*)
  into recent_count
  from public.export_authorizations
  where created_at > now() - make_interval(secs => p_window_seconds)
    and (
      (p_user_id is not null and user_id = p_user_id)
      or (
        p_user_id is null
        and p_ip_address is not null
        and ip_address = p_ip_address
      )
    );

  if recent_count >= p_limit then
    raise exception 'export_authorize_rate_limited'
      using errcode = 'P0001';
  end if;

  insert into public.export_authorizations (
    export_id,
    user_id,
    file_type,
    decision,
    reason,
    cost,
    balance_at_check,
    ip_address
  ) values (
    p_export_id,
    p_user_id,
    p_file_type,
    p_decision,
    p_reason,
    p_cost,
    p_balance_at_check,
    p_ip_address
  );
end;
$$;

revoke all on function public.try_insert_export_authorization(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  integer,
  integer
) from public;

grant execute on function public.try_insert_export_authorization(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  bigint,
  text,
  integer,
  integer
) to service_role;
