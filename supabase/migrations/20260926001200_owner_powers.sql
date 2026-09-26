-- Owner powers: announcements to everyone (bell + pinned in the Lounge) and
-- timed chat mutes. Owners only; admins keep what they had.

-- ---------------------------------------------------------------
-- Owner check (logs through admin_guard like every staff action)
-- ---------------------------------------------------------------

create or replace function public.owner_guard(p_action text, p_target text default null, p_details jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.admins where user_id = me and role = 'owner') then
    raise exception 'Owners only.';
  end if;

  return public.admin_guard(p_action, p_target, p_details);
end;
$$;

revoke all on function public.owner_guard(text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Timed mutes
-- ---------------------------------------------------------------

alter table public.profiles add column if not exists chat_muted_until timestamptz;

create or replace function public.assert_can_chat(p_me uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  until timestamptz;
  mins integer;
begin
  if p_me is null then
    raise exception 'Not signed in';
  end if;

  if exists (select 1 from public.profiles where id = p_me and chat_banned) then
    raise exception 'Your chat access has been turned off.';
  end if;

  select chat_muted_until into until from public.profiles where id = p_me;

  if until is not null and until > now() then
    mins := ceil(extract(epoch from until - now()) / 60);
    raise exception 'You''re muted from chat for %.',
      case
        when mins < 60 then mins || ' more min'
        when mins <= 60 then '1 more hour'
        when mins < 1440 then ceil(mins / 60.0) || ' more hours'
        when mins <= 1440 then '1 more day'
        else ceil(mins / 1440.0) || ' more days'
      end;
  end if;
end;
$$;

revoke all on function public.assert_can_chat(uuid) from public, anon, authenticated;

-- p_minutes: null = forever (the existing chat ban), 0 = unmute, otherwise that many minutes.
create or replace function public.owner_mute_user(p_user uuid, p_minutes integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_guard(
    case when p_minutes = 0 then 'unmute' else 'mute' end,
    p_user::text,
    json_build_object('user', p_user, 'minutes', p_minutes)::jsonb
  );

  if p_user = auth.uid() then
    raise exception 'You can''t mute yourself.';
  end if;

  if p_minutes is distinct from 0 and exists (select 1 from public.admins where user_id = p_user) then
    raise exception 'Staff can''t be muted. Remove their role first.';
  end if;

  if p_minutes is not null and (p_minutes < 0 or p_minutes > 60 * 24 * 365) then
    raise exception 'Pick a mute length.';
  end if;

  update public.profiles
  set chat_banned = (p_minutes is null),
      chat_muted_until = case when p_minutes > 0 then now() + make_interval(mins => p_minutes) end
  where id = p_user;
end;
$$;

revoke all on function public.owner_mute_user(uuid, integer) from public, anon;
grant execute on function public.owner_mute_user(uuid, integer) to authenticated;

-- ---------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------

create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 140),
  body text check (body is null or char_length(body) <= 280),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

alter table public.announcements enable row level security;

drop policy if exists "signed-in users read the pinned announcement" on public.announcements;
create policy "signed-in users read the pinned announcement"
  on public.announcements for select
  to authenticated
  using (active);

revoke insert, update, delete, truncate on public.announcements from anon, authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout', 'moment_open', 'announcement'));

create or replace function public.owner_announce(p_title text, p_body text default null, p_link text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  title text := btrim(coalesce(p_title, ''));
  msg text := nullif(btrim(coalesce(p_body, '')), '');
  target text := nullif(btrim(coalesce(p_link, '')), '');
  new_id bigint;
begin
  perform public.owner_guard('announce', null, json_build_object('title', title)::jsonb);

  if title = '' then
    raise exception 'Give it a title.';
  end if;

  if char_length(title) > 140 or char_length(coalesce(msg, '')) > 280 then
    raise exception 'Keep the title under 140 characters and the message under 280.';
  end if;

  if target is not null and target !~ '^/[A-Za-z0-9/_?=&.%-]*$' then
    raise exception 'The link must be a page on the site, like /events.';
  end if;

  if (select count(*) from public.announcements where created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'That''s a lot of announcements. Wait a few minutes.';
  end if;

  -- Only one pinned at a time.
  update public.announcements set active = false where active;

  insert into public.announcements (title, body, link, created_by)
  values (title, msg, target, auth.uid())
  returning id into new_id;

  insert into public.notifications (user_id, kind, title, body, link, actor_id)
  select p.id, 'announcement', '📣 ' || left(title, 137), msg, target, auth.uid()
  from public.profiles p;

  return new_id;
end;
$$;

revoke all on function public.owner_announce(text, text, text) from public, anon;
grant execute on function public.owner_announce(text, text, text) to authenticated;

create or replace function public.owner_unpin_announcement()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_guard('unpin_announcement');
  update public.announcements set active = false where active;
end;
$$;

revoke all on function public.owner_unpin_announcement() from public, anon;
grant execute on function public.owner_unpin_announcement() to authenticated;
