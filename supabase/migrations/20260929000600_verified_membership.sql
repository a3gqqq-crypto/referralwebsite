-- Verified: a monthly membership ($7 per 30 days) that puts a tick next to
-- your name. The tick evolves with consecutive months (like Discord Nitro):
-- 1 Bronze, 2 Silver, 3 Gold, 6 Platinum, 12 Diamond, 24 Legend.
-- Crypto can't auto-charge, so each payment adds 30 days. Letting it lapse
-- for more than 30 days starts the month count over.

alter table public.profiles add column if not exists verified_until timestamptz;
alter table public.profiles add column if not exists verified_months integer not null default 0;
grant select (verified_until, verified_months) on public.profiles to anon, authenticated;

alter table public.cosmetics drop constraint if exists cosmetics_type_check;
alter table public.cosmetics add constraint cosmetics_type_check
  check (type in ('frame', 'name', 'banner', 'badge', 'avatar', 'emote', 'sticker', 'membership'));

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('verified-month', 'membership', 'Verified (30 days)', 'legendary', 700, null)
on conflict (id) do update set price_cents = excluded.price_cents, name = excluded.name, type = excluded.type;

-- Adds months of Verified to someone.
create or replace function public.extend_verified(p_user uuid, p_months integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  until timestamptz;
  months integer;
begin
  select verified_until, verified_months into until, months from public.profiles where id = p_user;

  -- More than 30 days lapsed: the tick starts over at Bronze.
  if until is null or until < now() - interval '30 days' then
    months := 0;
  end if;

  update public.profiles
  set verified_months = coalesce(months, 0) + p_months,
      verified_until = greatest(coalesce(until, now()), now()) + (p_months * interval '30 days')
  where id = p_user;

  perform public.notify(
    p_user, 'gift', 'You''re Verified ✓',
    'Your tick is live for the next ' || (p_months * 30) || ' days. Keep it going and it levels up.',
    '/shop', null
  );
end;
$$;
revoke all on function public.extend_verified(uuid, integer) from public, anon, authenticated;

-- Memberships can be bought again and again; items only once.
create or replace function public.create_crypto_order(p_cosmetic text, p_network text, p_token text, p_public boolean default true)
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

  if item.type <> 'membership'
     and exists (select 1 from public.user_cosmetics where user_id = me and cosmetic_id = p_cosmetic) then
    raise exception 'You already own this.';
  end if;

  if (select count(*) from public.crypto_orders
      where user_id = me and status = 'pending' and expires_at > now()) >= 5 then
    raise exception 'You have a few unpaid orders open. Finish one or wait 30 minutes.';
  end if;

  insert into public.crypto_orders (user_id, cosmetic_id, show_publicly, network, token, amount, pay_to)
  values (me, p_cosmetic, coalesce(p_public, true), p_network, p_token,
          public.unique_crypto_amount(item.price_cents / 100.0, p_network, p_token), lower(addr))
  returning * into created;

  return created;
end;
$$;
revoke all on function public.create_crypto_order(text, text, text, boolean) from public, anon;
grant execute on function public.create_crypto_order(text, text, text, boolean) to authenticated;

-- A paid order: memberships extend Verified; items go in the locker;
-- donations give the Supporter badge.
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

  if paid.cosmetic_id = 'verified-month' then
    perform public.extend_verified(paid.user_id, 1);
  else
    insert into public.user_cosmetics (user_id, cosmetic_id, source)
    values (paid.user_id, coalesce(paid.cosmetic_id, 'badge-supporter'), 'purchase')
    on conflict do nothing;
  end if;

  return true;
end;
$$;
revoke all on function public.complete_crypto_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_crypto_order(uuid, text) to service_role;

-- The owner gets Verified free (like everything else in the shop).
create or replace function public.owner_grant_verified(p_months integer default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  perform public.owner_guard('grant_verified', me::text, json_build_object('months', p_months)::jsonb);

  if p_months not between 1 and 24 then
    raise exception 'Pick 1 to 24 months.';
  end if;

  perform public.extend_verified(me, p_months);
end;
$$;
revoke all on function public.owner_grant_verified(integer) from public, anon;
grant execute on function public.owner_grant_verified(integer) to authenticated;
