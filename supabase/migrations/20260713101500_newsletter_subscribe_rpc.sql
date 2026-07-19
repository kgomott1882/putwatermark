create or replace function public.subscribe_to_newsletter(
  p_email text,
  p_name text default null,
  p_source text default 'footer'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_source text;
  v_existing public.newsletter_subscribers%rowtype;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  v_name := nullif(left(trim(coalesce(p_name, '')), 120), '');
  v_source := left(coalesce(nullif(trim(coalesce(p_source, '')), ''), 'footer'), 64);

  if v_email = '' then
    raise exception 'Email is required.';
  end if;

  if length(v_email) > 320 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  select *
  into v_existing
  from public.newsletter_subscribers
  where lower(email) = v_email;

  if found then
    if v_existing.status = 'active' then
      return jsonb_build_object(
        'ok', true,
        'status', 'already_subscribed',
        'message', 'You''re already subscribed.'
      );
    end if;

    update public.newsletter_subscribers
    set
      name = coalesce(v_name, v_existing.name),
      source = v_source,
      status = 'active',
      subscribed_at = now(),
      unsubscribed_at = null,
      updated_at = now()
    where id = v_existing.id;

    return jsonb_build_object(
      'ok', true,
      'status', 'reactivated',
      'message', 'You''re back on the list. Thanks for subscribing.'
    );
  end if;

  insert into public.newsletter_subscribers (email, name, source, status)
  values (v_email, v_name, v_source, 'active');

  return jsonb_build_object(
    'ok', true,
    'status', 'subscribed',
    'message', 'Thanks for subscribing. We''ll be in touch when it''s worth your time.'
  );
end;
$$;

revoke all on function public.subscribe_to_newsletter(text, text, text) from public;
grant execute on function public.subscribe_to_newsletter(text, text, text) to anon, authenticated;
