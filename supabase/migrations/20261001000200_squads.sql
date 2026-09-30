-- Squads and weekly Squad Wars.
-- A squad is a team (up to 30). Each week (Monday 00:00 UTC to the next) a
-- squad scores the XP its members earn while in it. The top squad's members
-- get the Squad Champion badge. Names/tags go through the kid-safe filter.

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 24),
  tag text not null check (tag ~ '^[A-Z0-9]{2,4}$'),
  emblem text not null default '⚡',
  color text not null default 'sunset',
  description text not null default '' check (char_length(description) <= 140),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists squads_tag_key on public.squads (tag);
create unique index if not exists squads_name_key on public.squads (lower(name));
create index if not exists squads_owner_idx on public.squads (owner_id);

create table if not exists public.squad_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  squad_id uuid not null references public.squads(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists squad_members_squad_idx on public.squad_members (squad_id);

-- People removed by a squad's owner can't rejoin that squad.
create table if not exists public.squad_kicks (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (squad_id, user_id)
);

-- Weekly winners, for the "last week's champions" list.
create table if not exists public.squad_champions (
  week_start date primary key,
  squad_id uuid references public.squads(id) on delete set null,
  squad_name text not null,
  squad_tag text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_kicks enable row level security;
alter table public.squad_champions enable row level security;

-- Squads are public (like profiles): anyone signed in can see them.
drop policy if exists "squads are public" on public.squads;
create policy "squads are public" on public.squads for select to anon, authenticated using (true);
drop policy if exists "squad members are public" on public.squad_members;
create policy "squad members are public" on public.squad_members for select to anon, authenticated using (true);
drop policy if exists "champions are public" on public.squad_champions;
create policy "champions are public" on public.squad_champions for select to anon, authenticated using (true);
grant select on public.squads, public.squad_members, public.squad_champions to anon, authenticated;

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule, active)
values ('badge-squad-champ', 'badge', 'Squad Champion', 'legendary', null, '{"manual": true}', true)
on conflict (id) do nothing;

/* ---------- Scoring ---------- */

create or replace function public.squad_week_start(p_at timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', p_at at time zone 'UTC') at time zone 'UTC';
$$;

-- Standings for the week starting p_week (default: this week).
create or replace function public.squad_standings(p_week timestamptz default null)
returns table(id uuid, name text, tag text, emblem text, color text, members integer, score integer)
language sql
stable security definer
set search_path = ''
as $$
  with bounds as (
    select coalesce(p_week, public.squad_week_start()) as starts,
           coalesce(p_week, public.squad_week_start()) + interval '7 days' as ends
  )
  select s.id, s.name, s.tag, s.emblem, s.color,
    (select count(*)::integer from public.squad_members m where m.squad_id = s.id),
    coalesce((
      select sum(x.amount)::integer
      from public.squad_members m
      join public.xp_events x on x.user_id = m.user_id
      cross join bounds b
      where m.squad_id = s.id
        and x.created_at >= greatest(b.starts, m.joined_at)
        and x.created_at < b.ends
    ), 0)
  from public.squads s
  order by 7 desc, s.created_at asc;
$$;

-- Each member's XP for the squad this week.
create or replace function public.squad_contributions(p_squad uuid)
returns table(user_id uuid, joined_at timestamptz, score integer)
language sql
stable security definer
set search_path = ''
as $$
  select m.user_id, m.joined_at,
    coalesce((
      select sum(x.amount)::integer from public.xp_events x
      where x.user_id = m.user_id
        and x.created_at >= greatest(public.squad_week_start(), m.joined_at)
    ), 0)
  from public.squad_members m
  where m.squad_id = p_squad
  order by 3 desc, m.joined_at asc;
$$;

/* ---------- Actions ---------- */

create or replace function public.squad_clean(p_text text, p_field text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  value text := regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g');
begin
  if value <> '' then
    begin
      perform public.assert_kid_safe(value);
    exception when others then
      raise exception 'That % isn''t allowed. Keep it friendly.', p_field;
    end;
  end if;
  return value;
end;
$$;

create or replace function public.create_squad(p_name text, p_tag text, p_emblem text, p_color text, p_description text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sid uuid;
  clean_name text := public.squad_clean(p_name, 'name');
  clean_tag text := upper(btrim(coalesce(p_tag, '')));
begin
  if me is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.squad_members where user_id = me) then
    raise exception 'Leave your squad first.';
  end if;
  if char_length(clean_name) < 3 or char_length(clean_name) > 24 then
    raise exception 'Squad names are 3 to 24 characters.';
  end if;
  if clean_tag !~ '^[A-Z0-9]{2,4}$' then
    raise exception 'Tags are 2 to 4 letters or numbers.';
  end if;
  perform public.squad_clean(clean_tag, 'tag');
  if exists (select 1 from public.squads where tag = clean_tag) then
    raise exception 'That tag is taken.';
  end if;
  if exists (select 1 from public.squads where lower(name) = lower(clean_name)) then
    raise exception 'That name is taken.';
  end if;
  if (select count(*) from public.squads where owner_id = me and created_at > now() - interval '1 day') >= 2 then
    raise exception 'You made a squad recently. Try again tomorrow.';
  end if;

  insert into public.squads (name, tag, emblem, color, description, owner_id)
  values (
    clean_name, clean_tag,
    case when p_emblem = any (array['⚡','🔥','👑','🐺','🦁','🐉','🚀','💎','🌙','🌸','🎮','⚽','🦅','👻','🍀','🎯'])
      then p_emblem else '⚡' end,
    case when p_color = any (array['sunset','ocean','forest','grape','gold','night'])
      then p_color else 'sunset' end,
    left(public.squad_clean(p_description, 'description'), 140),
    me
  )
  returning id into sid;

  insert into public.squad_members (user_id, squad_id) values (me, sid);
  return sid;
end;
$$;

create or replace function public.join_squad(p_squad uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.squads where id = p_squad) then raise exception 'Squad not found.'; end if;
  if exists (select 1 from public.squad_members where user_id = me) then
    raise exception 'Leave your squad first.';
  end if;
  if exists (select 1 from public.squad_kicks where squad_id = p_squad and user_id = me) then
    raise exception 'You can''t join this squad.';
  end if;
  if (select count(*) from public.squad_members where squad_id = p_squad) >= 30 then
    raise exception 'This squad is full (30 members).';
  end if;

  insert into public.squad_members (user_id, squad_id) values (me, p_squad);
end;
$$;

-- Leaving: the owner role passes to the longest-standing member; an empty squad is deleted.
create or replace function public.leave_squad()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sid uuid;
  heir uuid;
begin
  delete from public.squad_members where user_id = me returning squad_id into sid;
  if sid is null then return; end if;

  if not exists (select 1 from public.squad_members where squad_id = sid) then
    delete from public.squads where id = sid;
    return;
  end if;

  if exists (select 1 from public.squads where id = sid and owner_id = me) then
    select user_id into heir from public.squad_members where squad_id = sid order by joined_at limit 1;
    update public.squads set owner_id = heir where id = sid;
  end if;
end;
$$;

create or replace function public.kick_from_squad(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sid uuid;
begin
  select id into sid from public.squads where owner_id = me;
  if sid is null then raise exception 'Only squad owners can remove people.'; end if;
  if p_user = me then raise exception 'Leave the squad instead.'; end if;
  if not exists (select 1 from public.squad_members where user_id = p_user and squad_id = sid) then
    raise exception 'They''re not in your squad.';
  end if;

  delete from public.squad_members where user_id = p_user and squad_id = sid;
  insert into public.squad_kicks (squad_id, user_id) values (sid, p_user) on conflict do nothing;
end;
$$;

create or replace function public.update_squad(p_description text, p_emblem text, p_color text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if not exists (select 1 from public.squads where owner_id = me) then
    raise exception 'Only squad owners can edit the squad.';
  end if;

  update public.squads set
    description = left(public.squad_clean(p_description, 'description'), 140),
    emblem = case when p_emblem = any (array['⚡','🔥','👑','🐺','🦁','🐉','🚀','💎','🌙','🌸','🎮','⚽','🦅','👻','🍀','🎯'])
      then p_emblem else emblem end,
    color = case when p_color = any (array['sunset','ocean','forest','grape','gold','night'])
      then p_color else color end
  where owner_id = me;
end;
$$;

-- Monday 00:05 UTC: last week's top squad (with a score) wins. Members in it
-- at the end of the week get the badge and a notification.
create or replace function public.award_squad_champions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_week timestamptz := public.squad_week_start() - interval '7 days';
  winner record;
  member uuid;
begin
  if exists (select 1 from public.squad_champions where week_start = last_week::date) then return; end if;

  select * into winner from public.squad_standings(last_week) where score > 0 limit 1;
  if winner.id is null then return; end if;

  insert into public.squad_champions (week_start, squad_id, squad_name, squad_tag, score)
  values (last_week::date, winner.id, winner.name, winner.tag, winner.score);

  for member in select user_id from public.squad_members where squad_id = winner.id loop
    insert into public.user_cosmetics (user_id, cosmetic_id, source)
    values (member, 'badge-squad-champ', 'earned')
    on conflict do nothing;

    perform public.notify(member, 'announcement', '🏆 Your squad won Squad Wars!',
      winner.name || ' finished #1 last week. You earned the Squad Champion badge.', '/squads/' || winner.tag, null);
  end loop;
end;
$$;

revoke all on function public.award_squad_champions() from public, anon, authenticated;
revoke all on function public.squad_clean(text, text) from public, anon, authenticated;
revoke all on function public.create_squad(text, text, text, text, text) from public, anon;
revoke all on function public.join_squad(uuid) from public, anon;
revoke all on function public.leave_squad() from public, anon;
revoke all on function public.kick_from_squad(uuid) from public, anon;
revoke all on function public.update_squad(text, text, text) from public, anon;
grant execute on function public.create_squad(text, text, text, text, text), public.join_squad(uuid),
  public.leave_squad(), public.kick_from_squad(uuid), public.update_squad(text, text, text) to authenticated;
grant execute on function public.squad_standings(timestamptz), public.squad_contributions(uuid),
  public.squad_week_start(timestamptz) to anon, authenticated;

select cron.unschedule('squad-champions') where exists (select 1 from cron.job where jobname = 'squad-champions');
select cron.schedule('squad-champions', '5 0 * * 1', $$select public.award_squad_champions()$$);
