-- Gifts: buy a shop item or Verified for a friend. Only friends can be
-- gifted (kids use Suffrova, so no strangers offering "free stuff").
-- The owner gifts for free (items via admin_grant_cosmetic, Verified here).

alter table public.crypto_orders add column if not exists gift_to uuid references public.profiles (id) on delete set null;
create index if not exists crypto_orders_gift_to_idx on public.crypto_orders (gift_to);

drop function if exists public.create_crypto_order(text, text, text, boolean);

create function public.create_crypto_order(
  p_cosmetic text,
  p_network text,
  p_token text,
  p_public boolean default true,
  p_gift_to uuid default null
)
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
  receiver uuid := coalesce(p_gift_to, me);
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

  if p_gift_to is not null then
    if p_gift_to = me then
      raise exception 'That''s you! Buy it normally instead.';
    end if;

    if not exists (
      select 1 from public.friendships
      where user_a = least(me, p_gift_to) and user_b = greatest(me, p_gift_to) and status = 'accepted'
    ) or public.is_blocked_between(me, p_gift_to) then
      raise exception 'You can only send gifts to friends.';
    end if;
  end if;

  if item.type <> 'membership'
     and exists (select 1 from public.user_cosmetics where user_id = receiver and cosmetic_id = p_cosmetic) then
    raise exception '%', case when p_gift_to is null then 'You already own this.' else 'They already have this one. Pick another gift.' end;
  end if;

  if (select count(*) from public.crypto_orders
      where user_id = me and status = 'pending' and expires_at > now()) >= 5 then
    raise exception 'You have a few unpaid orders open. Finish one or wait 30 minutes.';
  end if;

  insert into public.crypto_orders (user_id, cosmetic_id, show_publicly, network, token, amount, pay_to, gift_to)
  values (me, p_cosmetic, coalesce(p_public, true), p_network, p_token,
          public.unique_crypto_amount(item.price_cents / 100.0, p_network, p_token), lower(addr), p_gift_to)
  returning * into created;

  return created;
end;
$$;
revoke all on function public.create_crypto_order(text, text, text, boolean, uuid) from public, anon;
grant execute on function public.create_crypto_order(text, text, text, boolean, uuid) to authenticated;

-- A paid order goes to the gift receiver if there is one.
create or replace function public.complete_crypto_order(p_order uuid, p_tx text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid public.crypto_orders;
  receiver uuid;
  giver text;
  item_name text;
begin
  update public.crypto_orders
  set status = 'paid', tx_hash = lower(p_tx), paid_at = now()
  where id = p_order and status = 'pending'
  returning * into paid;

  if paid.id is null then
    return false;
  end if;

  receiver := coalesce(paid.gift_to, paid.user_id);

  if paid.cosmetic_id = 'verified-month' then
    perform public.extend_verified(receiver, 1);
  else
    insert into public.user_cosmetics (user_id, cosmetic_id, source)
    values (receiver, coalesce(paid.cosmetic_id, 'badge-supporter'),
            case when paid.gift_to is null then 'purchase' else 'gift' end)
    on conflict do nothing;
  end if;

  if paid.gift_to is not null then
    select coalesce(display_name, username) into giver from public.profiles where id = paid.user_id;
    select name into item_name from public.cosmetics where id = paid.cosmetic_id;
    perform public.notify(
      paid.gift_to, 'gift', giver || ' sent you a gift 🎁',
      'You got ' || coalesce(item_name, 'a gift') || '. Check your profile.',
      '/profile', paid.user_id
    );
  end if;

  return true;
end;
$$;
revoke all on function public.complete_crypto_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_crypto_order(uuid, text) to service_role;

-- Owner: gift a month of Verified to anyone, free.
create or replace function public.owner_gift_verified(p_user uuid, p_months integer default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_guard('gift_verified', p_user::text, json_build_object('months', p_months)::jsonb);

  if p_months not between 1 and 24 then
    raise exception 'Pick 1 to 24 months.';
  end if;

  perform public.extend_verified(p_user, p_months);
end;
$$;
revoke all on function public.owner_gift_verified(uuid, integer) from public, anon;
grant execute on function public.owner_gift_verified(uuid, integer) to authenticated;
