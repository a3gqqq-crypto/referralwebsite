-- Donations through the same crypto checkout. A paid donation gives the
-- Supporter badge and (if the donor chose) a spot on the supporters wall.

alter table public.crypto_orders alter column cosmetic_id drop not null;

alter table public.crypto_orders
  add column if not exists kind text not null default 'item' check (kind in ('item', 'donation')),
  add column if not exists show_publicly boolean not null default true;

alter table public.crypto_orders drop constraint if exists crypto_orders_kind_item_check;
alter table public.crypto_orders
  add constraint crypto_orders_kind_item_check
  check ((kind = 'item') = (cosmetic_id is not null));

-- Shared: a unique amount (base + 0.0001–0.0099) for open orders on this coin.
create or replace function public.unique_crypto_amount(p_base numeric, p_network text, p_token text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate numeric;
  tries integer := 0;
begin
  loop
    tries := tries + 1;
    candidate := p_base + (1 + floor(random() * 99)) / 10000.0;

    exit when not exists (
      select 1 from public.crypto_orders
      where network = p_network and token = p_token and amount = candidate
        and status = 'pending' and expires_at > now() - interval '2 hours'
    );

    if tries > 50 then
      raise exception 'Checkout is busy. Try again in a minute.';
    end if;
  end loop;

  return candidate;
end;
$$;

revoke all on function public.unique_crypto_amount(numeric, text, text) from public, anon, authenticated;

create or replace function public.create_crypto_donation(p_dollars integer, p_network text, p_token text, p_public boolean default true)
returns public.crypto_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  addr text;
  created public.crypto_orders;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_network not in ('bsc', 'polygon') or p_token not in ('USDT', 'USDC') then
    raise exception 'Pick a coin and network.';
  end if;

  if p_dollars is null or p_dollars < 1 or p_dollars > 1000 then
    raise exception 'Donations are between $1 and $1000.';
  end if;

  select value into addr from public.app_settings where key = 'crypto_address';

  if addr is null then
    raise exception 'Donations aren''t open yet.';
  end if;

  if (select count(*) from public.crypto_orders
      where user_id = me and status = 'pending' and expires_at > now()) >= 5 then
    raise exception 'You have a few unpaid orders open. Finish one or wait 30 minutes.';
  end if;

  insert into public.crypto_orders (user_id, cosmetic_id, kind, show_publicly, network, token, amount, pay_to)
  values (me, null, 'donation', coalesce(p_public, true), p_network, p_token,
          public.unique_crypto_amount(p_dollars, p_network, p_token), lower(addr))
  returning * into created;

  return created;
end;
$$;

revoke all on function public.create_crypto_donation(integer, text, text, boolean) from public, anon;
grant execute on function public.create_crypto_donation(integer, text, text, boolean) to authenticated;

-- Item orders now share the amount helper.
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

  insert into public.crypto_orders (user_id, cosmetic_id, network, token, amount, pay_to)
  values (me, p_cosmetic, p_network, p_token,
          public.unique_crypto_amount(item.price_cents / 100.0, p_network, p_token), lower(addr))
  returning * into created;

  return created;
end;
$$;

-- Paying a donation gives the Supporter badge.
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
  values (paid.user_id, coalesce(paid.cosmetic_id, 'badge-supporter'), 'purchase')
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.complete_crypto_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_crypto_order(uuid, text) to service_role;

-- Supporters wall: people who donated and chose to be shown. No amounts.
create or replace function public.supporters_wall()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar text,
  equipped_frame text,
  equipped_name text,
  last_donated timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar, p.equipped_frame, p.equipped_name, max(o.paid_at)
  from public.crypto_orders o
  join public.profiles p on p.id = o.user_id
  where o.kind = 'donation' and o.status = 'paid' and o.show_publicly
  group by p.id
  order by max(o.paid_at) desc
  limit 60;
$$;

revoke all on function public.supporters_wall() from public, anon;
grant execute on function public.supporters_wall() to authenticated;

-- Owner order list includes the kind.
drop function if exists public.owner_crypto_orders();

create function public.owner_crypto_orders()
returns table (
  id uuid,
  username text,
  kind text,
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
  select o.id, p.username, o.kind, o.cosmetic_id, o.network, o.token, o.amount, o.status, o.tx_hash, o.created_at, o.paid_at
  from public.crypto_orders o
  join public.profiles p on p.id = o.user_id
  where o.status = 'paid' or o.created_at > now() - interval '3 days'
  order by o.created_at desc
  limit 100;
end;
$$;

revoke all on function public.owner_crypto_orders() from public, anon;
grant execute on function public.owner_crypto_orders() to authenticated;
