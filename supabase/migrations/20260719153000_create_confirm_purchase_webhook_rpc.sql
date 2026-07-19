create unique index if not exists credit_transactions_purchase_id_unique
  on public.credit_transactions (related_purchase_id)
  where reason = 'purchase' and related_purchase_id is not null;

create or replace function public.confirm_purchase_from_webhook(
  p_processor text,
  p_processor_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_existing_tx_id uuid;
begin
  if p_processor is null or p_processor_ref is null then
    raise exception 'processor and processor_ref are required';
  end if;

  select *
  into v_purchase
  from public.purchases
  where processor = p_processor
    and processor_ref = p_processor_ref
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'purchase_not_found'
    );
  end if;

  if v_purchase.status = 'confirmed' then
    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'purchase_id', v_purchase.id
    );
  end if;

  if v_purchase.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'invalid_purchase_status',
      'status', v_purchase.status
    );
  end if;

  select id
  into v_existing_tx_id
  from public.credit_transactions
  where related_purchase_id = v_purchase.id
    and reason = 'purchase'
  limit 1;

  if v_existing_tx_id is not null then
    update public.purchases
    set
      status = 'confirmed',
      webhook_confirmed_at = coalesce(webhook_confirmed_at, now())
    where id = v_purchase.id;

    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'purchase_id', v_purchase.id
    );
  end if;

  update public.purchases
  set
    status = 'confirmed',
    webhook_confirmed_at = now()
  where id = v_purchase.id;

  insert into public.credit_transactions (
    user_id,
    amount,
    reason,
    related_purchase_id
  )
  values (
    v_purchase.user_id,
    v_purchase.credits_purchased,
    'purchase',
    v_purchase.id
  );

  return jsonb_build_object(
    'success', true,
    'already_confirmed', false,
    'purchase_id', v_purchase.id,
    'credits_granted', v_purchase.credits_purchased
  );
exception
  when unique_violation then
    update public.purchases
    set
      status = 'confirmed',
      webhook_confirmed_at = coalesce(webhook_confirmed_at, now())
    where id = v_purchase.id;

    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'purchase_id', v_purchase.id
    );
end;
$$;

create or replace function public.fail_purchase_from_webhook(
  p_processor text,
  p_processor_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  if p_processor is null or p_processor_ref is null then
    raise exception 'processor and processor_ref are required';
  end if;

  select *
  into v_purchase
  from public.purchases
  where processor = p_processor
    and processor_ref = p_processor_ref
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'purchase_not_found'
    );
  end if;

  if v_purchase.status = 'confirmed' then
    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'purchase_id', v_purchase.id
    );
  end if;

  if v_purchase.status = 'failed' then
    return jsonb_build_object(
      'success', true,
      'already_failed', true,
      'purchase_id', v_purchase.id
    );
  end if;

  if v_purchase.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'invalid_purchase_status',
      'status', v_purchase.status
    );
  end if;

  update public.purchases
  set status = 'failed'
  where id = v_purchase.id;

  return jsonb_build_object(
    'success', true,
    'already_failed', false,
    'purchase_id', v_purchase.id
  );
end;
$$;

revoke all on function public.confirm_purchase_from_webhook(text, text) from public;
revoke all on function public.fail_purchase_from_webhook(text, text) from public;
