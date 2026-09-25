-- In-app notifications and daily quests.

-- ===============================================================
-- NOTIFICATIONS
-- ===============================================================

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout')),
  title text not null check (char_length(title) <= 140),
  body text check (body is null or char_length(body) <= 280),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.notifications from anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Internal: write a notification (and drop ones older than 60 days).
create or replace function public.notify(
  p_user uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;

  insert into public.notifications (user_id, kind, title, body, link, actor_id)
  values (p_user, p_kind, left(p_title, 140), left(p_body, 280), p_link, p_actor);

  delete from public.notifications
  where user_id = p_user and created_at < now() - interval '60 days';
end;
$$;

revoke all on function public.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

revoke all on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- ---------------------------------------------------------------
-- Level-ups (award_xp now tells you when you level up)
-- ---------------------------------------------------------------

create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select floor(sqrt(greatest(p_xp, 0) / 50.0))::integer + 1;
$$;

create or replace function public.tier_for_level(p_level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_level >= 30 then 'Legend'
    when p_level >= 20 then 'Diamond'
    when p_level >= 15 then 'Platinum'
    when p_level >= 10 then 'Gold'
    when p_level >= 5 then 'Silver'
    else 'Bronze'
  end;
$$;

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
  new_xp integer;
  old_level integer;
  new_level integer;
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

  update public.profiles set xp = xp + granted where id = p_user
  returning xp into new_xp;

  old_level := public.level_for_xp(new_xp - granted);
  new_level := public.level_for_xp(new_xp);

  if new_level > old_level then
    perform public.notify(
      p_user, 'level',
      'You reached Level ' || new_level || ' 🎉',
      case
        when public.tier_for_level(new_level) <> public.tier_for_level(old_level)
          then 'New rank unlocked: ' || public.tier_for_level(new_level) || '.'
        else 'Keep going.'
      end,
      '/profile'
    );
  end if;

  return granted;
end;
$$;

revoke all on function public.award_xp(uuid, integer, text, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Referrals: "X joined with your link" + "X passed you" on live boards
-- ---------------------------------------------------------------

create or replace function public.notify_on_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter_name text := (select username from public.profiles where id = new.inviter_id);
  invited_name text := (select username from public.profiles where id = new.invited_user_id);
  ev record;
  my_count integer;
  my_joined timestamptz;
  passed record;
begin
  perform public.notify(
    new.inviter_id, 'referral',
    coalesce(invited_name, 'Someone') || ' joined with your link',
    '+100 XP. Keep sharing it.',
    case when invited_name is not null then '/u/' || invited_name else '/invites' end,
    new.invited_user_id
  );

  for ev in
    select e.id, e.title, e.starts_at, e.ends_at
    from public.events e
    where e.type = 'referral' and e.active and e.starts_at <= now() and e.ends_at > now()
      and exists (select 1 from public.event_participants p where p.event_id = e.id and p.user_id = new.inviter_id)
  loop
    select min(joined_at) into my_joined
    from public.event_participants where event_id = ev.id and user_id = new.inviter_id;

    select count(*) into my_count
    from public.referrals r
    where r.inviter_id = new.inviter_id and r.created_at between ev.starts_at and ev.ends_at;

    -- Whoever sat just above the inviter (one fewer invite now, but ahead on the
    -- tie-break before this referral) has just been passed.
    for passed in
      select p.user_id
      from (
        select user_id, min(joined_at) as joined_at
        from public.event_participants where event_id = ev.id group by user_id
      ) p
      where p.user_id <> new.inviter_id
        and p.joined_at < my_joined
        and (select count(*) from public.referrals r
             where r.inviter_id = p.user_id and r.created_at between ev.starts_at and ev.ends_at) = my_count - 1
    loop
      perform public.notify(
        passed.user_id, 'passed',
        coalesce(inviter_name, 'Someone') || ' just passed you',
        'In ' || ev.title || '. One invite gets you back ahead.',
        '/events/' || ev.id || '/leaderboard',
        new.inviter_id
      );
    end loop;
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_on_referral() from public, anon, authenticated;

drop trigger if exists notify_referral on public.referrals;
create trigger notify_referral after insert on public.referrals
  for each row execute function public.notify_on_referral();

-- ---------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------

create or replace function public.notify_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
  requester_name text;
  accepter uuid;
  accepter_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    other := case when new.user_a = new.requested_by then new.user_b else new.user_a end;
    requester_name := (select username from public.profiles where id = new.requested_by);

    perform public.notify(
      other, 'friend_request',
      coalesce(requester_name, 'Someone') || ' sent you a friend request',
      'Accept it to start chatting.',
      '/chat',
      new.requested_by
    );
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    accepter := case when new.user_a = new.requested_by then new.user_b else new.user_a end;
    accepter_name := (select username from public.profiles where id = accepter);

    perform public.notify(
      new.requested_by, 'friend_accept',
      coalesce(accepter_name, 'Someone') || ' accepted your friend request',
      'Say hi 👋',
      case when accepter_name is not null then '/chat/' || accepter_name else '/chat' end,
      accepter
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_on_friendship() from public, anon, authenticated;

drop trigger if exists notify_friendship on public.friendships;
create trigger notify_friendship after insert or update of status on public.friendships
  for each row execute function public.notify_on_friendship();

-- ---------------------------------------------------------------
-- Gifts and payouts from the admin panel
-- ---------------------------------------------------------------

create or replace function public.admin_grant_cosmetic(p_user uuid, p_cosmetic text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_name text;
begin
  perform public.admin_guard('grant_cosmetic', p_user::text, json_build_object('cosmetic', p_cosmetic)::jsonb);

  select name into item_name from public.cosmetics where id = p_cosmetic;

  if item_name is null then
    raise exception 'Unknown item.';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  values (p_user, p_cosmetic, 'gift')
  on conflict do nothing;

  if found then
    perform public.notify(p_user, 'gift', 'You got ' || item_name || ' 🎁', 'A gift from the Vexora team. Equip it on your profile.', '/profile');
  end if;
end;
$$;

revoke all on function public.admin_grant_cosmetic(uuid, text) from public, anon;
grant execute on function public.admin_grant_cosmetic(uuid, text) to authenticated;

create or replace function public.admin_set_payout(
  p_event_id text,
  p_user uuid,
  p_place integer,
  p_reward text,
  p_paid boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_paid boolean;
begin
  perform public.admin_guard(
    case when p_paid then 'mark_paid' else 'mark_unpaid' end,
    p_event_id,
    json_build_object('user', p_user, 'place', p_place, 'reward', p_reward)::jsonb
  );

  select paid_at is not null into was_paid
  from public.event_payouts where event_id = p_event_id and user_id = p_user;

  insert into public.event_payouts (event_id, user_id, place, reward, paid_at, note)
  values (p_event_id, p_user, p_place, p_reward, case when p_paid then now() end, nullif(btrim(p_note), ''))
  on conflict (event_id, user_id) do update set
    place = excluded.place,
    reward = excluded.reward,
    paid_at = excluded.paid_at,
    note = coalesce(excluded.note, public.event_payouts.note);

  if p_paid and not coalesce(was_paid, false) then
    perform public.notify(
      p_user, 'payout',
      'Your prize was sent 💸',
      coalesce(p_reward, 'Your reward') || ' for finishing #' || p_place || ' in '
        || coalesce((select title from public.events where id = p_event_id), 'an event') || '.',
      '/events/' || p_event_id || '/leaderboard'
    );
  end if;
end;
$$;

revoke all on function public.admin_set_payout(text, uuid, integer, text, boolean, text) from public, anon;
grant execute on function public.admin_set_payout(text, uuid, integer, text, boolean, text) to authenticated;

-- ===============================================================
-- DAILY QUESTS
-- ===============================================================

alter table public.xp_events drop constraint if exists xp_events_reason_check;
alter table public.xp_events
  add constraint xp_events_reason_check
  check (reason in ('referral', 'welcome', 'checkin', 'event', 'moment', 'friend', 'lounge', 'quest'));

-- Every day: the invite quest plus two that rotate, the same for everyone.
create or replace function public.daily_quest_ids(p_day date)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'invite',
    (array['lounge', 'moment', 'friend', 'dm', 'photo'])[((p_day - date '2026-01-01') % 5) + 1],
    (array['lounge', 'moment', 'friend', 'dm', 'photo'])[((p_day - date '2026-01-01' + 2) % 5) + 1]
  ];
$$;

create or replace function public.quest_info(p_quest text, out title text, out target integer, out reward integer)
language sql
immutable
set search_path = ''
as $$
  select q.title, q.target, q.reward from (values
    ('invite', 'Invite 1 friend', 1, 60),
    ('lounge', 'Send 3 messages in the Lounge', 3, 20),
    ('moment', 'Send someone a Moment', 1, 25),
    ('friend', 'Make a new friend', 1, 25),
    ('dm', 'Message a friend', 1, 15),
    ('photo', 'Share a photo in chat', 1, 15)
  ) q(id, title, target, reward)
  where q.id = p_quest;
$$;

create or replace function public.quest_progress(p_user uuid, p_quest text, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case p_quest
    when 'invite' then (select count(*) from public.referrals where inviter_id = p_user and created_at >= p_since)
    when 'lounge' then (select count(*) from public.lounge_messages where sender_id = p_user and created_at >= p_since and not deleted)
    when 'moment' then (select count(*) from public.moments where creator_id = p_user and created_at >= p_since)
    when 'friend' then (select count(*) from public.friendships
                        where (user_a = p_user or user_b = p_user) and status = 'accepted' and accepted_at >= p_since)
    when 'dm' then (select count(*) from public.direct_messages where sender_id = p_user and created_at >= p_since)
    when 'photo' then (select count(*) from public.lounge_messages where sender_id = p_user and image is not null and created_at >= p_since)
                    + (select count(*) from public.direct_messages where sender_id = p_user and image is not null and created_at >= p_since)
    else 0
  end::integer;
$$;

revoke all on function public.quest_progress(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.my_daily_quests()
returns table (id text, title text, target integer, progress integer, reward integer, claimed boolean, sweep_claimed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  since timestamptz := today::timestamp at time zone 'UTC';
  q text;
  info record;
  swept boolean;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  swept := exists (select 1 from public.xp_events x where x.user_id = me and x.reason = 'quest' and x.ref = today || ':sweep');

  foreach q in array public.daily_quest_ids(today) loop
    select * into info from public.quest_info(q);

    id := q;
    title := info.title;
    target := info.target;
    progress := least(public.quest_progress(me, q, since), info.target);
    reward := info.reward;
    claimed := exists (select 1 from public.xp_events x where x.user_id = me and x.reason = 'quest' and x.ref = today || ':' || q);
    sweep_claimed := swept;

    return next;
  end loop;
end;
$$;

revoke all on function public.my_daily_quests() from public, anon;
grant execute on function public.my_daily_quests() to authenticated;

create or replace function public.claim_quest(p_quest text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  since timestamptz := today::timestamp at time zone 'UTC';
  info record;
  granted integer;
  sweep integer := 0;
  q text;
  all_done boolean := true;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if not (p_quest = any (public.daily_quest_ids(today))) then
    raise exception 'That quest isn''t on today''s list.';
  end if;

  select * into info from public.quest_info(p_quest);

  if public.quest_progress(me, p_quest, since) < info.target then
    raise exception 'Finish the quest first.';
  end if;

  granted := public.award_xp(me, info.reward, 'quest', today || ':' || p_quest);

  if granted = 0 then
    raise exception 'Already claimed.';
  end if;

  foreach q in array public.daily_quest_ids(today) loop
    if not exists (select 1 from public.xp_events x where x.user_id = me and x.reason = 'quest' and x.ref = today || ':' || q) then
      all_done := false;
    end if;
  end loop;

  if all_done then
    sweep := public.award_xp(me, 40, 'quest', today || ':sweep');
  end if;

  return json_build_object('awarded', granted, 'sweep', sweep);
end;
$$;

revoke all on function public.claim_quest(text) from public, anon;
grant execute on function public.claim_quest(text) to authenticated;
