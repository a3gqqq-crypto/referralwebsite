-- Leaderboards for donors and top spenders, purchases/donations in the
-- activity feed, and a "show me publicly" choice on item orders too.

-- ---------------------------------------------------------------
-- Item orders take the public choice as well
-- ---------------------------------------------------------------

drop function if exists public.create_crypto_order(text, text, text);

create function public.create_crypto_order(p_cosmetic text, p_network text, p_token text, p_public boolean default true)
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

  insert into public.crypto_orders (user_id, cosmetic_id, show_publicly, network, token, amount, pay_to)
  values (me, p_cosmetic, coalesce(p_public, true), p_network, p_token,
          public.unique_crypto_amount(item.price_cents / 100.0, p_network, p_token), lower(addr))
  returning * into created;

  return created;
end;
$$;

revoke all on function public.create_crypto_order(text, text, text, boolean) from public, anon;
grant execute on function public.create_crypto_order(text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------
-- Leaderboards (only orders the buyer chose to show)
-- ---------------------------------------------------------------

drop function if exists public.supporters_wall();

create or replace function public.spend_leaderboard(p_donations_only boolean default false)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar text,
  equipped_frame text,
  equipped_name text,
  equipped_badges text[],
  xp integer,
  total numeric,
  last_paid timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar, p.equipped_frame, p.equipped_name, p.equipped_badges, p.xp,
         round(sum(o.amount), 2), max(o.paid_at)
  from public.crypto_orders o
  join public.profiles p on p.id = o.user_id
  where o.status = 'paid' and o.show_publicly
    and (not p_donations_only or o.kind = 'donation')
  group by p.id
  order by sum(o.amount) desc, max(o.paid_at) asc
  limit 25;
$$;

revoke all on function public.spend_leaderboard(boolean) from public, anon;
grant execute on function public.spend_leaderboard(boolean) to authenticated;

-- ---------------------------------------------------------------
-- Activity feed: purchases and donations
-- ---------------------------------------------------------------

create or replace function public.activity_feed(p_limit integer default 12)
returns table (kind text, actor text, target text, detail text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select 'join'::text, pi.username, pv.username, null::text, r.created_at
    from public.referrals r
    join public.profiles pi on pi.id = r.inviter_id
    join public.profiles pv on pv.id = r.invited_user_id
    where r.created_at > now() - interval '30 days'
      and pi.username is not null and pv.username is not null

    union all

    select 'new', p.username, null, null, p.created_at
    from public.profiles p
    where p.created_at > now() - interval '30 days'
      and p.username is not null
      and not exists (select 1 from public.referrals r where r.invited_user_id = p.id)

    union all

    select 'level', p.username, null, substring(n.title from 'Level ([0-9]+)'), n.created_at
    from public.notifications n
    join public.profiles p on p.id = n.user_id
    where n.kind = 'level' and n.created_at > now() - interval '30 days'
      and coalesce(substring(n.title from 'Level ([0-9]+)')::integer, 0) >= 3

    union all

    select 'passed', a.username, b.username, null, n.created_at
    from public.notifications n
    join public.profiles a on a.id = n.actor_id
    join public.profiles b on b.id = n.user_id
    where n.kind = 'passed' and n.created_at > now() - interval '30 days'

    union all

    select 'moment', coalesce(p.username, m.creator_username), null, null, m.created_at
    from public.moments m
    left join public.profiles p on p.id = m.creator_id
    where m.created_at > now() - interval '30 days'
      and coalesce(p.username, m.creator_username) is not null

    union all

    -- Purchases say what was bought; donations never show an amount.
    select case o.kind when 'donation' then 'donation' else 'purchase' end,
           p.username, null, c.name, o.paid_at
    from public.crypto_orders o
    join public.profiles p on p.id = o.user_id
    left join public.cosmetics c on c.id = o.cosmetic_id
    where o.status = 'paid' and o.show_publicly and o.paid_at > now() - interval '30 days'
      and p.username is not null
  ) feed (kind, actor, target, detail, created_at)
  order by created_at desc
  limit least(greatest(p_limit, 1), 30);
$$;

revoke all on function public.activity_feed(integer) from public, anon;
grant execute on function public.activity_feed(integer) to authenticated;
