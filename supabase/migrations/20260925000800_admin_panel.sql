-- Admin panel: admins, audit log, events in the database, payouts, and
-- admin-only RPCs. Every admin RPC re-checks admin status server-side.

-- ---------------------------------------------------------------
-- Admins + audit log
-- ---------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (user_id)
select id from public.profiles where username = 'DreamCM'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;

create or replace function public.admin_guard(p_action text, p_target text default null, p_details jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.admins where user_id = me) then
    raise exception 'Admins only.';
  end if;

  if p_action is not null then
    insert into public.admin_log (admin_id, action, target, details)
    values (me, p_action, p_target, p_details);
  end if;

  return me;
end;
$$;

revoke all on function public.admin_guard(text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Events live in the database now
-- ---------------------------------------------------------------

create table if not exists public.events (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  title text not null check (char_length(title) between 3 and 80),
  subtitle text check (subtitle is null or char_length(subtitle) <= 80),
  description text not null check (char_length(description) between 10 and 400),
  prize text not null check (char_length(prize) between 1 and 40),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  image text not null default '/events/summer.png',
  type text not null default 'referral' check (type in ('referral', 'custom')),
  active boolean not null default true,
  winners jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.events enable row level security;

drop policy if exists "events are public" on public.events;
create policy "events are public"
  on public.events for select
  to anon, authenticated
  using (active or public.is_admin());

revoke insert, update, delete on public.events from anon, authenticated;

insert into public.events (id, title, subtitle, description, prize, starts_at, ends_at, image, type, active, winners) values
  ('top-inviter-2', 'Vexora Top Inviter · Round 2', 'EVERYONE STARTS AT ZERO.',
   'Round 2 is on. Only invites made during these 15 days count — invite the most new members and finish top three to win cash.',
   '$35 Total', '2026-09-25T20:00:00+05:30', '2026-10-10T20:00:00+05:30', '/events/summer.png', 'referral', true,
   '[{"position":1,"reward":"$20"},{"position":2,"reward":"$10"},{"position":3,"reward":"$5"}]'),
  ('top-inviter', 'Vexora Top Inviter', 'INVITE THE MOST. WIN THE MOST.',
   'Invite new members to Vexora, climb the referral leaderboard, and finish in the top three to win cash rewards.',
   '$35 Total', '2026-08-27T00:00:00+05:30', '2026-09-11T23:59:59+05:30', '/events/summer.png', 'referral', true,
   '[{"position":1,"reward":"$20"},{"position":2,"reward":"$10"},{"position":3,"reward":"$5"}]')
on conflict (id) do nothing;

-- Joining is only allowed while an event exists and hasn't ended.
drop policy if exists "Users can join events" on public.event_participants;
create policy "Users can join events"
  on public.event_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.active and e.ends_at > now()
    )
  );

-- ---------------------------------------------------------------
-- Payout tracking
-- ---------------------------------------------------------------

create table if not exists public.event_payouts (
  event_id text not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place integer not null,
  reward text,
  paid_at timestamptz,
  note text check (note is null or char_length(note) <= 200),
  primary key (event_id, user_id)
);

alter table public.event_payouts enable row level security;
revoke all on public.event_payouts from anon, authenticated;

-- ---------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------

create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return json_build_object(
    'users', (select count(*) from public.profiles),
    'new_24h', (select count(*) from public.profiles where created_at > now() - interval '24 hours'),
    'new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'referrals_24h', (select count(*) from public.referrals where created_at > now() - interval '24 hours'),
    'referrals_7d', (select count(*) from public.referrals where created_at > now() - interval '7 days'),
    'lounge_24h', (select count(*) from public.lounge_messages where created_at > now() - interval '24 hours'),
    'dms_24h', (select count(*) from public.direct_messages where created_at > now() - interval '24 hours'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'chat_banned', (select count(*) from public.profiles where chat_banned)
  );
end;
$$;

create or replace function public.admin_reports(p_status text default 'open')
returns table (
  id bigint,
  kind text,
  reason text,
  status text,
  created_at timestamptz,
  reporter text,
  reported_id uuid,
  reported text,
  reported_banned boolean,
  message_id bigint,
  message_body text,
  message_deleted boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return query
  select
    r.id, r.kind, r.reason, r.status, r.created_at,
    rp.username, r.reported_user_id, tp.username, tp.chat_banned,
    r.message_id,
    case r.kind
      when 'lounge' then (select l.body from public.lounge_messages l where l.id = r.message_id)
      when 'dm' then (select d.body from public.direct_messages d where d.id = r.message_id)
    end,
    case r.kind
      when 'lounge' then (select l.deleted from public.lounge_messages l where l.id = r.message_id)
    end
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  join public.profiles tp on tp.id = r.reported_user_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_resolve_report(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('reviewed', 'dismissed', 'open') then
    raise exception 'Unknown status';
  end if;

  perform public.admin_guard('resolve_report', p_id::text, json_build_object('status', p_status)::jsonb);

  update public.reports set status = p_status where id = p_id;
end;
$$;

create or replace function public.admin_set_chat_ban(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(case when p_banned then 'chat_ban' else 'chat_unban' end, p_user::text);

  if p_banned and exists (select 1 from public.admins where user_id = p_user) then
    raise exception 'You can''t ban an admin.';
  end if;

  update public.profiles set chat_banned = p_banned where id = p_user;
end;
$$;

create or replace function public.admin_delete_lounge_message(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('delete_lounge_message', p_id::text);

  update public.lounge_messages set deleted = true where id = p_id;
end;
$$;

create or replace function public.admin_grant_cosmetic(p_user uuid, p_cosmetic text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('grant_cosmetic', p_user::text, json_build_object('cosmetic', p_cosmetic)::jsonb);

  if not exists (select 1 from public.cosmetics where id = p_cosmetic) then
    raise exception 'Unknown item.';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  values (p_user, p_cosmetic, 'gift')
  on conflict do nothing;
end;
$$;

create or replace function public.admin_save_event(p_event jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('save_event', p_event ->> 'id', p_event);

  insert into public.events (id, title, subtitle, description, prize, starts_at, ends_at, image, type, active, winners)
  values (
    p_event ->> 'id',
    p_event ->> 'title',
    nullif(p_event ->> 'subtitle', ''),
    p_event ->> 'description',
    p_event ->> 'prize',
    (p_event ->> 'starts_at')::timestamptz,
    (p_event ->> 'ends_at')::timestamptz,
    coalesce(nullif(p_event ->> 'image', ''), '/events/summer.png'),
    coalesce(p_event ->> 'type', 'referral'),
    coalesce((p_event ->> 'active')::boolean, true),
    coalesce(p_event -> 'winners', '[]'::jsonb)
  )
  on conflict (id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    prize = excluded.prize,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    image = excluded.image,
    type = excluded.type,
    active = excluded.active,
    winners = excluded.winners;
end;
$$;

create or replace function public.admin_event_payouts(p_event_id text)
returns table (user_id uuid, place integer, reward text, paid_at timestamptz, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return query
  select p.user_id, p.place, p.reward, p.paid_at, p.note
  from public.event_payouts p
  where p.event_id = p_event_id;
end;
$$;

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
begin
  perform public.admin_guard(
    case when p_paid then 'mark_paid' else 'mark_unpaid' end,
    p_event_id,
    json_build_object('user', p_user, 'place', p_place, 'reward', p_reward)::jsonb
  );

  insert into public.event_payouts (event_id, user_id, place, reward, paid_at, note)
  values (p_event_id, p_user, p_place, p_reward, case when p_paid then now() end, nullif(btrim(p_note), ''))
  on conflict (event_id, user_id) do update set
    place = excluded.place,
    reward = excluded.reward,
    paid_at = excluded.paid_at,
    note = coalesce(excluded.note, public.event_payouts.note);
end;
$$;

create or replace function public.admin_log_list(p_limit integer default 100)
returns table (id bigint, admin text, action text, target text, details jsonb, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return query
  select l.id, p.username, l.action, l.target, l.details, l.created_at
  from public.admin_log l
  join public.profiles p on p.id = l.admin_id
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 500);
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'admin_overview()',
    'admin_reports(text)',
    'admin_resolve_report(bigint, text)',
    'admin_set_chat_ban(uuid, boolean)',
    'admin_delete_lounge_message(bigint)',
    'admin_grant_cosmetic(uuid, text)',
    'admin_save_event(jsonb)',
    'admin_event_payouts(text)',
    'admin_set_payout(text, uuid, integer, text, boolean, text)',
    'admin_log_list(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
