-- Shop checkout in stablecoins (USDT/USDC on BNB Smart Chain or Polygon),
-- paid straight to the owner's wallet. Each order gets a unique amount so a
-- payment can only match one order; the verify-crypto-payment edge function
-- reads the chain and calls complete_crypto_order when it checks out.

-- ---------------------------------------------------------------
-- Settings (the receive address is public; it's shown to buyers)
-- ---------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "signed-in users read public settings" on public.app_settings;
create policy "signed-in users read public settings"
  on public.app_settings for select
  to authenticated
  using (key in ('crypto_address'));

revoke insert, update, delete, truncate on public.app_settings from anon, authenticated;

create or replace function public.owner_set_crypto_address(p_address text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  addr text := nullif(btrim(coalesce(p_address, '')), '');
begin
  perform public.owner_guard('set_crypto_address', null, json_build_object('address', addr)::jsonb);

  if addr is not null and addr !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'That doesn''t look like a BNB Chain / Polygon address (0x followed by 40 characters).';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values ('crypto_address', addr, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.owner_set_crypto_address(text) from public, anon;
grant execute on function public.owner_set_crypto_address(text) to authenticated;

-- ---------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------

create table if not exists public.crypto_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  network text not null check (network in ('bsc', 'polygon')),
  token text not null check (token in ('USDT', 'USDC')),
  amount numeric(12, 4) not null check (amount > 0),
  pay_to text not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  tx_hash text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  paid_at timestamptz
);

create index if not exists crypto_orders_user_idx on public.crypto_orders (user_id, created_at desc);
create index if not exists crypto_orders_open_idx on public.crypto_orders (network, token, amount) where status = 'pending';

alter table public.crypto_orders enable row level security;

drop policy if exists "users read own crypto orders" on public.crypto_orders;
create policy "users read own crypto orders"
  on public.crypto_orders for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete, truncate on public.crypto_orders from anon, authenticated;

create or replace function public.create_crypto_order(p_cosmetic text, p_network text, p_token text)
returns public.crypto_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  item public.cosmetics;
  addr text;
  base numeric;
  candidate numeric;
  tries integer := 0;
  created public.crypto_orders;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_network not in ('bsc', 'polygon') or p_token not in ('USDT', 'USDC') then
    raise exception 'Pick a coin and network.';
  end if;

  select value into addr from public.app_settings where key = 'crypto_address';

  if addr is null then
    raise exception 'Crypto checkout isn''t open yet.';
  end if;

  select * into item from public.cosmetics where id = p_cosmetic and active;

  if item.id is null or item.price_cents is null then
    raise exception 'That item isn''t for sale.';
  end if;

  if exists (select 1 from public.user_cosmetics where user_id = me and cosmetic_id = p_cosmetic) then
    raise exception 'You already own this.';
  end if;

  if (select count(*) from public.crypto_orders
      where user_id = me and status = 'pending' and expires_at > now()) >= 5 then
    raise exception 'You have a few unpaid orders open. Finish one or wait 30 minutes.';
  end if;

  -- Price plus a tiny unique tail (0.0001–0.0099) so each payment matches one order.
  base := item.price_cents / 100.0;

  loop
    tries := tries + 1;
    candidate := base + (1 + floor(random() * 99)) / 10000.0;

    exit when not exists (
      select 1 from public.crypto_orders
      where network = p_network and token = p_token and amount = candidate
        and status = 'pending' and expires_at > now() - interval '2 hours'
    );

    if tries > 50 then
      raise exception 'Checkout is busy. Try again in a minute.';
    end if;
  end loop;

  insert into public.crypto_orders (user_id, cosmetic_id, network, token, amount, pay_to)
  values (me, p_cosmetic, p_network, p_token, candidate, lower(addr))
  returning * into created;

  return created;
end;
$$;

revoke all on function public.create_crypto_order(text, text, text) from public, anon;
grant execute on function public.create_crypto_order(text, text, text) to authenticated;

-- Called only by the verify-crypto-payment edge function (service role) after
-- it has checked the transaction on chain. The unique tx_hash stops reuse.
create or replace function public.complete_crypto_order(p_order uuid, p_tx text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid public.crypto_orders;
begin
  update public.crypto_orders
  set status = 'paid', tx_hash = lower(p_tx), paid_at = now()
  where id = p_order and status = 'pending'
  returning * into paid;

  if paid.id is null then
    return false;
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  values (paid.user_id, paid.cosmetic_id, 'purchase')
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.complete_crypto_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_crypto_order(uuid, text) to service_role;

-- Owner view of recent orders.
create or replace function public.owner_crypto_orders()
returns table (
  id uuid,
  username text,
  cosmetic_id text,
  network text,
  token text,
  amount numeric,
  status text,
  tx_hash text,
  created_at timestamptz,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_guard(null);

  return query
  select o.id, p.username, o.cosmetic_id, o.network, o.token, o.amount, o.status, o.tx_hash, o.created_at, o.paid_at
  from public.crypto_orders o
  join public.profiles p on p.id = o.user_id
  where o.status = 'paid' or o.created_at > now() - interval '3 days'
  order by o.created_at desc
  limit 100;
end;
$$;

revoke all on function public.owner_crypto_orders() from public, anon;
grant execute on function public.owner_crypto_orders() to authenticated;
