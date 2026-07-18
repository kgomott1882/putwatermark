create unique index if not exists credit_transactions_job_spend_export_id_unique
  on public.credit_transactions (related_job_id)
  where reason = 'job_spend' and related_job_id is not null;

create or replace function public.consume_export_credits(
  p_export_id uuid,
  p_user_id uuid,
  p_cost bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_existing_id uuid;
begin
  if p_cost is null or p_cost < 0 then
    raise exception 'invalid cost';
  end if;

  select id
  into v_existing_id
  from public.credit_transactions
  where related_job_id = p_export_id
    and user_id = p_user_id
    and reason = 'job_spend'
  limit 1;

  if v_existing_id is not null then
    select coalesce(balance, 0)
    into v_balance
    from public.credit_balances
    where user_id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'balance', coalesce(v_balance, 0),
      'already_charged', true,
      'cost', p_cost
    );
  end if;

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  v_balance := coalesce(v_balance, 0);

  if v_balance < p_cost then
    return jsonb_build_object(
      'success', false,
      'balance', v_balance,
      'already_charged', false,
      'error_code', 'insufficient_credits_at_consume',
      'cost', p_cost
    );
  end if;

  insert into public.credit_transactions (user_id, amount, reason, related_job_id)
  values (p_user_id, -p_cost, 'job_spend', p_export_id);

  select balance
  into v_balance
  from public.credit_balances
  where user_id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'balance', coalesce(v_balance, 0),
    'already_charged', false,
    'cost', p_cost
  );
exception
  when unique_violation then
    select coalesce(balance, 0)
    into v_balance
    from public.credit_balances
    where user_id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'balance', coalesce(v_balance, 0),
      'already_charged', true,
      'cost', p_cost
    );
end;
$$;

revoke all on function public.consume_export_credits(uuid, uuid, bigint) from public;
