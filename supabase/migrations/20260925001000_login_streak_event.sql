-- Monthly login-streak events. Each calendar month (IST) gets its own event,
-- created automatically; everyone who checks in is entered, and the board
-- ranks the longest run of consecutive daily check-ins inside that month.

alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check check (type in ('referral', 'custom', 'streak'));

-- ---------------------------------------------------------------
-- Create this month's and next month's streak events if missing
-- ---------------------------------------------------------------

create or replace function public.ensure_streak_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  this_month date := date_trunc('month', now() at time zone 'Asia/Kolkata')::date;
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
      m::timestamp at time zone 'Asia/Kolkata',
      ((m + interval '1 month')::timestamp - interval '1 second') at time zone 'Asia/Kolkata',
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

select public.ensure_streak_events();

-- ---------------------------------------------------------------
-- Daily check-in also enters you into the live streak event
-- ---------------------------------------------------------------

create or replace function public.daily_checkin()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Asia/Kolkata')::date;
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

  if last_day = today then
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

-- ---------------------------------------------------------------
-- Streak standings: best run of consecutive check-in days in the window.
-- Ties: more check-in days wins, then whoever reached that run first.
-- ---------------------------------------------------------------

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
      and e.ref::date between (p_starts at time zone 'Asia/Kolkata')::date
                          and (p_ends at time zone 'Asia/Kolkata')::date
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
