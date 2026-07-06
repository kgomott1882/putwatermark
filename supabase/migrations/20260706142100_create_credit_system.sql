create table public.credit_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  processor text not null check (processor in ('paypal', 'paystack')),
  processor_ref text not null,
  amount_usd numeric(10,2) not null,
  credits_purchased bigint not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'refunded')),
  webhook_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index purchases_processor_ref_unique
  on public.purchases (processor, processor_ref);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  reason text not null check (reason in ('purchase', 'job_spend', 'job_refund', 'expiry', 'expiry_reactivation', 'refund_request')),
  related_purchase_id uuid references public.purchases(id),
  related_job_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.credit_transactions (user_id, created_at);
create index on public.credit_transactions (expires_at) where expires_at is not null;

-- RLS
alter table public.credit_balances enable row level security;
alter table public.purchases enable row level security;
alter table public.credit_transactions enable row level security;

create policy "Users can view own balance"
  on public.credit_balances for select
  using (auth.uid() = user_id);

create policy "Users can view own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "Users can view own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- No insert/update policies for authenticated users on any of these three
-- tables - all writes happen server-side via webhook handlers using the
-- service role key, never directly from the client. This is intentional:
-- a user must never be able to insert their own credit transaction.

-- Function to keep credit_balances in sync whenever a transaction is inserted
create function public.apply_credit_transaction()
returns trigger as $$
begin
  insert into public.credit_balances (user_id, balance, updated_at)
  values (new.user_id, new.amount, now())
  on conflict (user_id)
  do update set
    balance = public.credit_balances.balance + new.amount,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_credit_transaction_insert
  after insert on public.credit_transactions
  for each row execute function public.apply_credit_transaction();
