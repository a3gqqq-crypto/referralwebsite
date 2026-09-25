-- Friends, blocks, public lounge, friend-only DMs, and reports.
-- Every write goes through SECURITY DEFINER RPCs so moderation, rate limits,
-- and friendship/block rules can't be skipped from the browser.

alter table public.profiles
  add column if not exists chat_banned boolean not null default false;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table if not exists public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "see own blocks" on public.blocks;
create policy "see own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create table if not exists public.lounge_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists lounge_messages_created_idx on public.lounge_messages (created_at desc);
create index if not exists lounge_messages_sender_idx on public.lounge_messages (sender_id, created_at desc);

alter table public.lounge_messages enable row level security;

drop policy if exists "signed-in users read the lounge" on public.lounge_messages;
create policy "signed-in users read the lounge"
  on public.lounge_messages for select
  to authenticated
  using (not deleted);

create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists direct_messages_pair_idx on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists direct_messages_unread_idx on public.direct_messages (recipient_id) where read_at is null;

alter table public.direct_messages enable row level security;

drop policy if exists "participants read dms" on public.direct_messages;
create policy "participants read dms"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('profile', 'lounge', 'dm')),
  message_id bigint,
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- No policies: only the dashboard (service role) can read reports.
alter table public.reports enable row level security;

revoke insert, update, delete on public.friendships, public.blocks, public.lounge_messages,
  public.direct_messages, public.reports from anon, authenticated;

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------

create or replace function public.chat_clean(p_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  body text := btrim(coalesce(p_body, ''));
  leet text;
  squashed text;
begin
  if body = '' then
    raise exception 'Message is empty.';
  end if;

  leet := translate(lower(body), '013457@$!', 'oieastasi');
  squashed := regexp_replace(leet, '[^a-z]', '', 'g');

  if squashed ~ '(childporn|childsex|childabuse|kidsex|minorsex|pedophil|lolicon|shotacon|nigger|nigga|faggot)'
     or leet ~ '\m(pedo|pedos|rape|raped|raping|rapist|molest\w*|incest|porn\w*|hentai|nsfw|nudes)\M' then
    raise exception 'That message isn''t allowed here.';
  end if;

  return regexp_replace(
    body,
    '\m(fuck\w*|shit\w*|bitch\w*|bastard\w*|asshole\w*|dick|dicks|pussy|pussies|cock|cocks|cunt\w*|whore\w*|slut\w*|retard\w*)\M',
    '***',
    'gi'
  );
end;
$$;

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function public.assert_can_chat(p_me uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_me is null then
    raise exception 'Not signed in';
  end if;

  if exists (select 1 from public.profiles where id = p_me and chat_banned) then
    raise exception 'Your chat access has been turned off.';
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- Friends + blocks
-- ---------------------------------------------------------------

create or replace function public.send_friend_request(p_target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  a uuid := least(me, p_target);
  b uuid := greatest(me, p_target);
  existing public.friendships;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_target is null or p_target = me then raise exception 'You can''t add yourself.'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'User not found.'; end if;
  if public.is_blocked_between(me, p_target) then raise exception 'You can''t add this person.'; end if;

  if (select count(*) from public.friendships
      where requested_by = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many requests. Try again later.';
  end if;

  select * into existing from public.friendships where user_a = a and user_b = b;

  if found then
    if existing.status = 'accepted' then
      return 'friends';
    end if;

    if existing.requested_by = p_target then
      update public.friendships set status = 'accepted', accepted_at = now()
      where user_a = a and user_b = b;
      return 'friends';
    end if;

    return 'pending';
  end if;

  insert into public.friendships (user_a, user_b, requested_by, status)
  values (a, b, me, 'pending');

  return 'pending';
end;
$$;

create or replace function public.respond_friend_request(p_other uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  a uuid := least(me, p_other);
  b uuid := greatest(me, p_other);
begin
  if me is null then raise exception 'Not signed in'; end if;

  if not exists (
    select 1 from public.friendships
    where user_a = a and user_b = b and status = 'pending' and requested_by = p_other
  ) then
    raise exception 'No request to respond to.';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now()
    where user_a = a and user_b = b;
    return 'friends';
  end if;

  delete from public.friendships where user_a = a and user_b = b;
  return 'none';
end;
$$;

create or replace function public.remove_friend(p_other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;

  delete from public.friendships
  where user_a = least(me, p_other) and user_b = greatest(me, p_other);
end;
$$;

create or replace function public.block_user(p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_target is null or p_target = me then raise exception 'You can''t block yourself.'; end if;

  insert into public.blocks (blocker_id, blocked_id) values (me, p_target)
  on conflict do nothing;

  delete from public.friendships
  where user_a = least(me, p_target) and user_b = greatest(me, p_target);
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target;
end;
$$;

-- ---------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------

create or replace function public.send_lounge_message(p_body text)
returns public.lounge_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text;
  inserted public.lounge_messages;
begin
  perform public.assert_can_chat(me);

  if char_length(btrim(coalesce(p_body, ''))) > 500 then
    raise exception 'Keep it under 500 characters.';
  end if;

  if p_body ~* '(https?://|www\.|discord\.gg|\m[a-z0-9-]+\.(com|net|org|gg|io|me|xyz|ly|co|app|link)\M)' then
    raise exception 'Links aren''t allowed in the lounge.';
  end if;

  if exists (select 1 from public.lounge_messages
             where sender_id = me and created_at > now() - interval '2 seconds')
     or (select count(*) from public.lounge_messages
         where sender_id = me and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Slow down a little.';
  end if;

  clean := public.chat_clean(p_body);

  if exists (select 1 from public.lounge_messages
             where sender_id = me and body = clean and created_at > now() - interval '1 minute') then
    raise exception 'You just sent that.';
  end if;

  insert into public.lounge_messages (sender_id, body) values (me, clean)
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function public.send_direct_message(p_recipient uuid, p_body text)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text;
  inserted public.direct_messages;
begin
  perform public.assert_can_chat(me);

  if not exists (
    select 1 from public.friendships
    where user_a = least(me, p_recipient) and user_b = greatest(me, p_recipient)
      and status = 'accepted'
  ) then
    raise exception 'You can only message friends.';
  end if;

  if public.is_blocked_between(me, p_recipient) then
    raise exception 'You can''t message this person.';
  end if;

  if char_length(btrim(coalesce(p_body, ''))) > 1000 then
    raise exception 'Keep it under 1000 characters.';
  end if;

  if (select count(*) from public.direct_messages
      where sender_id = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Slow down a little.';
  end if;

  clean := public.chat_clean(p_body);

  insert into public.direct_messages (sender_id, recipient_id, body)
  values (me, p_recipient, clean)
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function public.mark_dms_read(p_other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  update public.direct_messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
end;
$$;

create or replace function public.report_user(
  p_target uuid,
  p_kind text,
  p_message_id bigint default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_target = me then raise exception 'You can''t report yourself.'; end if;

  if (select count(*) from public.reports
      where reporter_id = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many reports. Try again later.';
  end if;

  insert into public.reports (reporter_id, reported_user_id, kind, message_id, reason)
  values (me, p_target, p_kind, p_message_id, left(nullif(btrim(p_reason), ''), 300));
end;
$$;

-- ---------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------

revoke all on function public.chat_clean(text) from public, anon, authenticated;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function public.assert_can_chat(uuid) from public, anon, authenticated;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.send_lounge_message(text) from public, anon;
revoke all on function public.send_direct_message(uuid, text) from public, anon;
revoke all on function public.mark_dms_read(uuid) from public, anon;
revoke all on function public.report_user(uuid, text, bigint, text) from public, anon;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.send_lounge_message(text) to authenticated;
grant execute on function public.send_direct_message(uuid, text) to authenticated;
grant execute on function public.mark_dms_read(uuid) to authenticated;
grant execute on function public.report_user(uuid, text, bigint, text) to authenticated;

-- ---------------------------------------------------------------
-- Realtime (profiles/referrals power the existing "live" leaderboard + history)
-- ---------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'referrals', 'lounge_messages', 'direct_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
