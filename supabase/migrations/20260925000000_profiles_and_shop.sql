-- Profiles, cosmetics catalog, inventory, and the RPCs the app uses to claim/equip them.
-- Ownership rows are only ever written by SECURITY DEFINER functions or the service role.


-- ---------------------------------------------------------------
-- Profile columns
-- ---------------------------------------------------------------

alter table public.profiles
  add column if not exists bio text,
  add column if not exists equipped_frame text,
  add column if not exists equipped_name text,
  add column if not exists equipped_banner text,
  add column if not exists equipped_badges text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_bio_length,
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160);

-- ---------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------

create table if not exists public.cosmetics (
  id text primary key,
  type text not null check (type in ('frame', 'name', 'banner', 'badge')),
  name text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  price_cents integer check (price_cents is null or price_cents > 0),
  earn_rule jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cosmetics enable row level security;

drop policy if exists "cosmetics are public" on public.cosmetics;
create policy "cosmetics are public"
  on public.cosmetics for select
  to anon, authenticated
  using (active);

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('frame-gilded',    'frame',  'Gilded',       'rare',      199, null),
  ('frame-ember',     'frame',  'Ember',        'rare',      199, null),
  ('frame-frost',     'frame',  'Frost',        'rare',      199, null),
  ('frame-aurora',    'frame',  'Aurora',       'epic',      299, null),
  ('frame-crowned',   'frame',  'Crowned',      'legendary', 499, null),
  ('frame-podium',    'frame',  'Podium',       'legendary', null, '{"manual": true}'),
  ('name-gold',       'name',   'Gold leaf',    'rare',      149, null),
  ('name-ember',      'name',   'Ember',        'rare',      149, null),
  ('name-frost',      'name',   'Frost',        'rare',      149, null),
  ('name-aurora',     'name',   'Aurora',       'epic',      249, null),
  ('name-holo',       'name',   'Holographic',  'legendary', 399, null),
  ('banner-dusk',     'banner', 'Dusk',         'common',     99, null),
  ('banner-rose',     'banner', 'Rose quartz',  'common',     99, null),
  ('banner-ocean',    'banner', 'Deep sea',     'rare',      149, null),
  ('banner-golddust', 'banner', 'Gold dust',    'rare',      199, null),
  ('banner-aurora',   'banner', 'Aurora',       'epic',      249, null),
  ('badge-first',     'badge',  'First invite', 'common',   null, '{"referrals": 1}'),
  ('badge-recruiter', 'badge',  'Recruiter',    'rare',     null, '{"referrals": 10}'),
  ('badge-legend',    'badge',  'Legend',       'legendary',null, '{"referrals": 50}'),
  ('badge-early',     'badge',  'Early',        'epic',     null, '{"joined_before": "2026-11-01"}'),
  ('badge-podium',    'badge',  'Podium',       'legendary',null, '{"manual": true}'),
  ('badge-supporter', 'badge',  'Supporter',    'rare',       99, null),
  ('badge-flame',     'badge',  'On fire',      'common',     99, null),
  ('badge-star',      'badge',  'Star',         'common',     99, null),
  ('badge-gem',       'badge',  'Gem',          'epic',      149, null)
on conflict (id) do update set
  type = excluded.type,
  name = excluded.name,
  rarity = excluded.rarity,
  price_cents = excluded.price_cents,
  earn_rule = excluded.earn_rule;

-- ---------------------------------------------------------------
-- Inventory + purchase log
-- ---------------------------------------------------------------

create table if not exists public.user_cosmetics (
  user_id uuid not null references auth.users (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  source text not null check (source in ('purchase', 'earned', 'gift')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

alter table public.user_cosmetics enable row level security;

drop policy if exists "users read own inventory" on public.user_cosmetics;
create policy "users read own inventory"
  on public.user_cosmetics for select
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  provider text not null,
  provider_ref text not null unique,
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in ('pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases"
  on public.purchases for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------

create or replace function public.claim_earned_cosmetics()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  select me, c.id, 'earned'
  from public.cosmetics c
  join public.profiles p on p.id = me
  where c.active
    and (
      (c.earn_rule ? 'referrals'
        and coalesce(p.referral_count, 0) >= (c.earn_rule ->> 'referrals')::int)
      or
      (c.earn_rule ? 'joined_before'
        and p.created_at < (c.earn_rule ->> 'joined_before')::timestamptz)
    )
  on conflict do nothing;
end;
$$;

create or replace function public.equip_cosmetic(p_slot text, p_cosmetic_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_slot not in ('frame', 'name', 'banner') then
    raise exception 'Unknown slot %', p_slot;
  end if;

  if p_cosmetic_id is not null and not exists (
    select 1
    from public.user_cosmetics uc
    join public.cosmetics c on c.id = uc.cosmetic_id
    where uc.user_id = me
      and uc.cosmetic_id = p_cosmetic_id
      and c.type = p_slot
  ) then
    raise exception 'You don''t own that item';
  end if;

  update public.profiles set
    equipped_frame  = case when p_slot = 'frame'  then p_cosmetic_id else equipped_frame end,
    equipped_name   = case when p_slot = 'name'   then p_cosmetic_id else equipped_name end,
    equipped_banner = case when p_slot = 'banner' then p_cosmetic_id else equipped_banner end
  where id = me;
end;
$$;

create or replace function public.set_equipped_badges(p_badges text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  wanted text[] := coalesce(p_badges, '{}');
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if cardinality(wanted) > 3 then
    raise exception 'You can show at most 3 badges';
  end if;

  if exists (
    select 1
    from unnest(wanted) as w(id)
    where not exists (
      select 1
      from public.user_cosmetics uc
      join public.cosmetics c on c.id = uc.cosmetic_id
      where uc.user_id = me and uc.cosmetic_id = w.id and c.type = 'badge'
    )
  ) then
    raise exception 'You don''t own one of those badges';
  end if;

  update public.profiles set equipped_badges = wanted where id = me;
end;
$$;

create or replace function public.update_profile_bio(p_bio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean text := nullif(btrim(p_bio), '');
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if clean is not null and char_length(clean) > 160 then
    raise exception 'Bio must be 160 characters or less';
  end if;

  update public.profiles set bio = clean where id = me;
end;
$$;

revoke all on function public.claim_earned_cosmetics() from public, anon;
revoke all on function public.equip_cosmetic(text, text) from public, anon;
revoke all on function public.set_equipped_badges(text[]) from public, anon;
revoke all on function public.update_profile_bio(text) from public, anon;

grant execute on function public.claim_earned_cosmetics() to authenticated;
grant execute on function public.equip_cosmetic(text, text) to authenticated;
grant execute on function public.set_equipped_badges(text[]) to authenticated;
grant execute on function public.update_profile_bio(text) to authenticated;

