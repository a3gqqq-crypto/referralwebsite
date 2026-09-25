-- Vexora is international: days (check-ins, streaks, daily XP caps) and the
-- monthly streak rounds now reset at 00:00 UTC for everyone instead of IST.

create or replace function public.award_xp(
  p_user uuid,
  p_amount integer,
  p_reason text,
  p_ref text,
  p_daily_cap integer default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted integer := p_amount;
  today_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  inserted_id bigint;
begin
  if p_user is null or p_amount <= 0 then
    return 0;
  end if;

  if p_daily_cap is not null then
    granted := least(
      p_amount,
      p_daily_cap - coalesce((
        select sum(amount) from public.xp_events
        where user_id = p_user and reason = p_reason and created_at >= today_start
      ), 0)
    );

    if granted <= 0 then
      return 0;
    end if;
  end if;

  insert into public.xp_events (user_id, amount, reason, ref)
  values (p_user, granted, p_reason, p_ref)
  on conflict (user_id, reason, ref) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return 0;
  end if;

  update public.profiles set xp = xp + granted where id = p_user;

  return granted;
end;
$$;

revoke all on function public.award_xp(uuid, integer, text, text, integer) from public, anon, authenticated;

create or replace function public.ensure_streak_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  this_month date := date_trunc('month', now() at time zone 'UTC')::date;
  m date;
begin
  foreach m in array array[this_month, (this_month + interval '1 month')::date] loop
    -- Streak rounds start in October 2026 (check-ins only exist from late September).
    continue when m < date '2026-10-01';

    insert into public.events (id, title, subtitle, description, prize, starts_at, ends_at, image, type, active, winners)
    values (
      'streak-' || to_char(m, 'YYYY-MM'),
      'Login Streak · ' || to_char(m, 'FMMonth YYYY'),
      'SHOW UP EVERY DAY.',
      'Open Vexora every day this month. The three longest login streaks when the month ends win secret prizes. Miss a day and your chain starts over.',
      'Secret prizes',
      m::timestamp at time zone 'UTC',
      ((m + interval '1 month')::timestamp - interval '1 second') at time zone 'UTC',
      '/events/streak.png',
      'streak',
      true,
      '[{"position":1,"reward":"Secret"},{"position":2,"reward":"Secret"},{"position":3,"reward":"Secret"}]'
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

revoke all on function public.ensure_streak_events() from public, anon, authenticated;

-- October's round hasn't started yet; move it to the UTC month.
update public.events
set starts_at = timestamptz '2026-10-01 00:00:00+00',
    ends_at = timestamptz '2026-10-31 23:59:59+00'
where id = 'streak-2026-10' and starts_at > now();

create or replace function public.daily_checkin()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  last_day date;
  streak integer;
  amount integer;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  perform public.ensure_streak_events();

  insert into public.event_participants (event_id, user_id)
  select e.id, me
  from public.events e
  where e.type = 'streak' and e.active and e.starts_at <= now() and e.ends_at > now()
  on conflict (event_id, user_id) do nothing;

  select last_checkin, checkin_streak into last_day, streak
  from public.profiles where id = me
  for update;

  if last_day >= today then
    return json_build_object('awarded', 0, 'streak', streak);
  end if;

  streak := case when last_day = today - 1 then streak + 1 else 1 end;
  amount := 10 + least((streak - 1) * 5, 30);

  update public.profiles set last_checkin = today, checkin_streak = streak where id = me;

  perform public.award_xp(me, amount, 'checkin', today::text);

  return json_build_object('awarded', amount, 'streak', streak);
end;
$$;

revoke all on function public.daily_checkin() from public, anon;
grant execute on function public.daily_checkin() to authenticated;

create or replace function public.streak_standings(
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
  xp integer
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
    p.xp
  from players pl
  join public.profiles p on p.id = pl.user_id
  left join best b on b.user_id = pl.user_id
  left join totals t on t.user_id = pl.user_id
  order by coalesce(b.len, 0) desc, coalesce(t.total, 0) desc, b.reached asc nulls last, pl.joined_at asc;
$$;

revoke all on function public.streak_standings(text, timestamptz, timestamptz) from public;
grant execute on function public.streak_standings(text, timestamptz, timestamptz) to anon, authenticated;
