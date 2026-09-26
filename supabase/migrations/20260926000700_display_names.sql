-- Display names: an optional name shown instead of the username. The username
-- itself never changes (it's the invite link, profile link and login).

alter table public.profiles
  add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 1 and 30);

-- Words and look-alikes that aren't allowed in names. Shared idea with the
-- sign-up page's username filter (src/components/Auth.jsx).
create or replace function public.name_blocked(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with n as (
    select regexp_replace(
      translate(normalize(lower(coalesce(p_name, '')), NFKD), '0134578@$!+', 'oieastbasit'),
      '[^a-z0-9]', '', 'g'
    ) as v
  )
  select exists (
    select 1 from n, unnest(array[
      'porn', 'hentai', 'sexual', 'nude', 'nsfw', 'xxx', 'fetish', 'rape', 'molest', 'incest',
      'childporn', 'childsex', 'childabuse', 'childsell', 'kidssex', 'kidsell', 'minorsex', 'minorsell',
      'underage', 'pedo', 'pedofil', 'lolicon', 'shotacon', 'shota',
      'sexsell', 'prostitut',
      'fuck', 'fuk', 'fck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy', 'cock', 'cunt', 'whore', 'slut',
      'nigger', 'nigga', 'faggot', 'retard'
    ]) as term
    where position(term in n.v) > 0
  )
  or exists (
    select 1 from n
    where n.v ~ '(p+o+r+n+|p+e+d+o+|c+h+i+l+d+s+e+x+|c+h+i+l+d+p+o+r+n+|c+h+i+l+d+s+e+l+l+|k+i+d+s+e+l+l+|m+i+n+o+r+s+e+x+|m+i+n+o+r+s+e+l+l+|u+n+d+e+r+a+g+e+|r+a+p+e+|m+o+l+e+s+t+)'
       -- Names that would look official.
       or n.v in ('mod', 'staff', 'support', 'owner', 'team')
       or n.v ~ '^(vexora|admin|moderator|official)'
       or n.v ~ '(admin|moderator)$'
  );
$$;

create or replace function public.set_display_name(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  squashed text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if clean = '' then
    update public.profiles set display_name = null where id = me;
    return null;
  end if;

  if char_length(clean) > 30 then
    raise exception 'Keep it to 30 characters.';
  end if;

  -- No invisible or direction-flipping characters.
  if clean ~ '[[:cntrl:]]'
     or clean ~ ('[' || chr(8203) || '-' || chr(8207) || chr(8234) || '-' || chr(8238)
                     || chr(8288) || '-' || chr(8292) || chr(65279) || ']') then
    raise exception 'That name has characters that aren''t allowed.';
  end if;

  if public.name_blocked(clean) then
    raise exception 'That name isn''t allowed.';
  end if;

  -- Can't pose as someone else by using their username as your name.
  squashed := regexp_replace(lower(clean), '[^a-z0-9_]', '', 'g');

  if exists (
    select 1 from public.profiles
    where id <> me and lower(username) = squashed
  ) then
    raise exception 'That''s someone else''s username. Pick a different name.';
  end if;

  update public.profiles set display_name = clean where id = me;

  return clean;
end;
$$;

revoke all on function public.set_display_name(text) from public, anon;
grant execute on function public.set_display_name(text) to authenticated;

create or replace function public.admin_clear_display_name(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('clear_display_name', p_user::text,
    json_build_object('user', p_user, 'name', (select display_name from public.profiles where id = p_user))::jsonb);

  update public.profiles set display_name = null where id = p_user;
end;
$$;

revoke all on function public.admin_clear_display_name(uuid) from public, anon;
grant execute on function public.admin_clear_display_name(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Leaderboards carry the display name too
-- ---------------------------------------------------------------

drop function if exists public.event_standings(text, timestamptz, timestamptz);

create function public.event_standings(
  p_event_id text,
  p_starts timestamptz,
  p_ends timestamptz
)
returns table (
  id uuid,
  username text,
  referral_count integer,
  created_at timestamptz,
  equipped_frame text,
  equipped_name text,
  equipped_badges text[],
  xp integer,
  avatar text,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    count(r.id)::integer as referral_count,
    p.created_at,
    p.equipped_frame,
    p.equipped_name,
    p.equipped_badges,
    p.xp,
    p.avatar,
    p.display_name
  from (
    select user_id, min(joined_at) as joined_at
    from public.event_participants
    where event_id = p_event_id
    group by user_id
  ) ep
  join public.profiles p on p.id = ep.user_id
  left join public.referrals r
    on r.inviter_id = p.id
   and r.created_at >= p_starts
   and r.created_at <= p_ends
  group by p.id, ep.joined_at
  order by count(r.id) desc, ep.joined_at asc;
$$;

revoke all on function public.event_standings(text, timestamptz, timestamptz) from public;
grant execute on function public.event_standings(text, timestamptz, timestamptz) to anon, authenticated;

drop function if exists public.streak_standings(text, timestamptz, timestamptz);

create function public.streak_standings(
  p_event_id text,
  p_starts timestamptz,
  p_ends timestamptz
)
returns table (
  id uuid,
  username text,
  best_streak integer,
  checkin_days integer,
  created_at timestamptz,
  equipped_frame text,
  equipped_name text,
  equipped_badges text[],
  xp integer,
  avatar text,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with players as (
    select user_id, min(joined_at) as joined_at
    from public.event_participants
    where event_id = p_event_id
    group by user_id
  ),
  days as (
    select e.user_id, e.ref::date as day
    from public.xp_events e
    join players pl on pl.user_id = e.user_id
    where e.reason = 'checkin'
      and e.ref::date between (p_starts at time zone 'UTC')::date
                          and (p_ends at time zone 'UTC')::date
  ),
  runs as (
    select user_id, count(*) as len, max(day) as reached
    from (
      select user_id, day, day - (row_number() over (partition by user_id order by day))::integer as grp
      from days
    ) grouped
    group by user_id, grp
  ),
  best as (
    select distinct on (user_id) user_id, len, reached
    from runs
    order by user_id, len desc, reached asc
  ),
  totals as (
    select user_id, count(*) as total from days group by user_id
  )
  select
    p.id,
    p.username,
    coalesce(b.len, 0)::integer,
    coalesce(t.total, 0)::integer,
    p.created_at,
    p.equipped_frame,
    p.equipped_name,
    p.equipped_badges,
    p.xp,
    p.avatar,
    p.display_name
  from players pl
  join public.profiles p on p.id = pl.user_id
  left join best b on b.user_id = pl.user_id
  left join totals t on t.user_id = pl.user_id
  order by coalesce(b.len, 0) desc, coalesce(t.total, 0) desc, b.reached asc nulls last, pl.joined_at asc;
$$;

revoke all on function public.streak_standings(text, timestamptz, timestamptz) from public;
grant execute on function public.streak_standings(text, timestamptz, timestamptz) to anon, authenticated;
