-- XP + levels. XP only comes from things the database can verify (referrals,
-- daily check-ins, events, moments, friends, lounge), each rewarded once per
-- source row (ref) and capped per day where spam is possible.

alter table public.profiles
  add column if not exists xp integer not null default 0,
  add column if not exists checkin_streak integer not null default 0,
  add column if not exists last_checkin date;

create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null check (reason in ('referral', 'welcome', 'checkin', 'event', 'moment', 'friend', 'lounge')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);

create index if not exists xp_events_daily_idx on public.xp_events (user_id, reason, created_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "users read own xp history" on public.xp_events;
create policy "users read own xp history"
  on public.xp_events for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.xp_events from anon, authenticated;

-- ---------------------------------------------------------------
-- Core award function (internal only)
-- ---------------------------------------------------------------

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
  today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
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

-- ---------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------

create or replace function public.xp_on_referral()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.award_xp(new.inviter_id, 100, 'referral', new.invited_user_id::text);
  perform public.award_xp(new.invited_user_id, 50, 'welcome', new.inviter_id::text);
  return new;
end;
$$;

create or replace function public.xp_on_event_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.award_xp(new.user_id, 25, 'event', new.event_id);
  return new;
end;
$$;

create or replace function public.xp_on_moment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.award_xp(new.creator_id, 15, 'moment', new.id, 45);
  return new;
end;
$$;

create or replace function public.xp_on_lounge_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.award_xp(new.sender_id, 2, 'lounge', new.id::text, 20);
  return new;
end;
$$;

create or replace function public.xp_on_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    perform public.award_xp(new.user_a, 15, 'friend', new.user_b::text, 75);
    perform public.award_xp(new.user_b, 15, 'friend', new.user_a::text, 75);
  end if;
  return new;
end;
$$;

revoke all on function public.xp_on_referral() from public, anon, authenticated;
revoke all on function public.xp_on_event_join() from public, anon, authenticated;
revoke all on function public.xp_on_moment() from public, anon, authenticated;
revoke all on function public.xp_on_lounge_message() from public, anon, authenticated;
revoke all on function public.xp_on_friendship() from public, anon, authenticated;

drop trigger if exists xp_referral on public.referrals;
create trigger xp_referral after insert on public.referrals
  for each row execute function public.xp_on_referral();

drop trigger if exists xp_event_join on public.event_participants;
create trigger xp_event_join after insert on public.event_participants
  for each row execute function public.xp_on_event_join();

drop trigger if exists xp_moment on public.moments;
create trigger xp_moment after insert on public.moments
  for each row execute function public.xp_on_moment();

drop trigger if exists xp_lounge on public.lounge_messages;
create trigger xp_lounge after insert on public.lounge_messages
  for each row execute function public.xp_on_lounge_message();

drop trigger if exists xp_friendship on public.friendships;
create trigger xp_friendship after insert or update of status on public.friendships
  for each row execute function public.xp_on_friendship();

-- ---------------------------------------------------------------
-- Daily check-in (the "come back every day" reward)
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
-- Backfill everything people already did
-- ---------------------------------------------------------------

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select inviter_id, 100, 'referral', invited_user_id::text, created_at from public.referrals
on conflict do nothing;

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select invited_user_id, 50, 'welcome', inviter_id::text, created_at from public.referrals
on conflict do nothing;

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select user_id, 25, 'event', event_id, min(joined_at) from public.event_participants
group by user_id, event_id
on conflict do nothing;

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select creator_id, 15, 'moment', id, created_at from public.moments
where creator_id in (select id from public.profiles)
on conflict do nothing;

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select user_a, 15, 'friend', user_b::text, coalesce(accepted_at, created_at) from public.friendships where status = 'accepted'
union all
select user_b, 15, 'friend', user_a::text, coalesce(accepted_at, created_at) from public.friendships where status = 'accepted'
on conflict do nothing;

insert into public.xp_events (user_id, amount, reason, ref, created_at)
select sender_id, 2, 'lounge', id::text, created_at from public.lounge_messages
on conflict do nothing;

update public.profiles p
set xp = coalesce((select sum(amount) from public.xp_events e where e.user_id = p.id), 0);

-- ---------------------------------------------------------------
-- Event standings now carry XP so level badges show on event boards
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
  xp integer
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
    p.xp
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
