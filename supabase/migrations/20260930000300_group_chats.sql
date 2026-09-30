-- Group chats. Friends-only: you can only add people you're friends with.
-- Same kid-safe filter, mutes, bans, rate limits and reports as DMs.

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists chat_group_members_user_idx on public.chat_group_members (user_id);

create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  image text,
  reply_to bigint references public.group_messages(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at desc);
create index if not exists group_messages_sender_idx on public.group_messages (sender_id, created_at desc);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;

create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.chat_group_members where group_id = p_group and user_id = p_user);
$$;

drop policy if exists "members read groups" on public.chat_groups;
create policy "members read groups" on public.chat_groups
  for select to authenticated using (public.is_group_member(id, (select auth.uid())));

drop policy if exists "members read members" on public.chat_group_members;
create policy "members read members" on public.chat_group_members
  for select to authenticated using (public.is_group_member(group_id, (select auth.uid())));

drop policy if exists "members read group messages" on public.group_messages;
create policy "members read group messages" on public.group_messages
  for select to authenticated using (public.is_group_member(group_id, (select auth.uid())));

grant select on public.chat_groups, public.chat_group_members, public.group_messages to authenticated;

-- Live updates.
do $$
begin
  alter publication supabase_realtime add table public.group_messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.chat_group_members;
exception when duplicate_object then null;
end $$;

-- Emote/sticker ownership, same as the Lounge and DMs.
drop trigger if exists group_emote_check on public.group_messages;
create trigger group_emote_check before insert on public.group_messages
  for each row execute function public.check_emote_message();

-- Photos: group members can see photos sent in their groups.
drop policy if exists "chat images: read if you can see the message" on storage.objects;
create policy "chat images: read if you can see the message" on storage.objects
  for select using (
    bucket_id = 'chat-images' and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or public.is_admin()
      or exists (select 1 from public.lounge_messages l where l.image = objects.name and not l.deleted)
      or exists (select 1 from public.direct_messages d
                 where d.image = objects.name and (d.sender_id = auth.uid() or d.recipient_id = auth.uid()))
      or exists (select 1 from public.group_messages g
                 where g.image = objects.name and public.is_group_member(g.group_id, auth.uid()))
    )
  );

create or replace function public.chat_image_ok(p_user uuid, p_image text)
returns void
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if p_image !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg)$'
     or split_part(p_image, '/', 1) <> p_user::text then
    raise exception 'That photo isn''t yours.';
  end if;

  if not exists (select 1 from storage.objects where bucket_id = 'chat-images' and name = p_image) then
    raise exception 'Upload the photo first.';
  end if;

  if exists (select 1 from public.lounge_messages where image = p_image)
     or exists (select 1 from public.direct_messages where image = p_image)
     or exists (select 1 from public.group_messages where image = p_image) then
    raise exception 'That photo was already sent.';
  end if;
end;
$$;

-- Reports can point at group messages.
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind = any (array['profile', 'lounge', 'dm', 'group']));

create or replace function public.admin_reports(p_status text default 'open')
returns table(id bigint, kind text, reason text, status text, created_at timestamptz, reporter text, reported_id uuid, reported text, reported_banned boolean, message_id bigint, message_body text, message_deleted boolean, message_image text)
language plpgsql
stable security definer
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
      when 'group' then (select g.body from public.group_messages g where g.id = r.message_id)
    end,
    case r.kind
      when 'lounge' then (select l.deleted from public.lounge_messages l where l.id = r.message_id)
    end,
    case r.kind
      when 'lounge' then (select l.image from public.lounge_messages l where l.id = r.message_id)
      when 'dm' then (select d.image from public.direct_messages d where d.id = r.message_id)
      when 'group' then (select g.image from public.group_messages g where g.id = r.message_id)
    end
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  join public.profiles tp on tp.id = r.reported_user_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit 200;
end;
$$;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind = any (array[
  'referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout', 'moment_open',
  'announcement', 'call', 'membership', 'group'
]));

/* ---------- Actions ---------- */

-- Friends only, not blocked either way.
create or replace function public.can_add_to_group(p_me uuid, p_other uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select p_other <> p_me
     and exists (select 1 from public.friendships
                 where user_a = least(p_me, p_other) and user_b = greatest(p_me, p_other) and status = 'accepted')
     and not public.is_blocked_between(p_me, p_other)
     and not exists (select 1 from public.profiles where id = p_other and site_banned);
$$;

create or replace function public.clean_group_name(p_name text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if name = '' then raise exception 'Give the group a name.'; end if;
  if char_length(name) > 40 then raise exception 'Keep the name under 40 characters.'; end if;
  perform public.assert_kid_safe(name);
  return name;
end;
$$;

create or replace function public.create_group(p_name text, p_members uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  gid uuid;
  member uuid;
  others uuid[] := array(select distinct unnest(coalesce(p_members, '{}')) except select me);
begin
  perform public.assert_can_chat(me);

  if coalesce(array_length(others, 1), 0) < 1 then
    raise exception 'Add at least one friend.';
  end if;
  if array_length(others, 1) > 19 then
    raise exception 'Groups can have up to 20 people.';
  end if;
  if (select count(*) from public.chat_groups where owner_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve made a lot of groups today. Try again tomorrow.';
  end if;

  foreach member in array others loop
    if not public.can_add_to_group(me, member) then
      raise exception 'You can only add friends.';
    end if;
  end loop;

  insert into public.chat_groups (name, owner_id) values (public.clean_group_name(p_name), me) returning id into gid;
  insert into public.chat_group_members (group_id, user_id) values (gid, me);
  insert into public.chat_group_members (group_id, user_id) select gid, unnest(others);

  perform public.notify(o, 'group', 'You were added to a group', 'Say hi in ' || (select name from public.chat_groups where id = gid), '/chat/g/' || gid, me)
  from unnest(others) as o;

  return gid;
end;
$$;

create or replace function public.add_group_members(p_group uuid, p_members uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  member uuid;
  added uuid[] := '{}';
begin
  perform public.assert_can_chat(me);
  if not public.is_group_member(p_group, me) then raise exception 'You''re not in this group.'; end if;

  foreach member in array coalesce(p_members, '{}') loop
    if public.is_group_member(p_group, member) then continue; end if;
    if not public.can_add_to_group(me, member) then raise exception 'You can only add friends.'; end if;
    added := added || member;
  end loop;

  if (select count(*) from public.chat_group_members where group_id = p_group) + coalesce(array_length(added, 1), 0) > 20 then
    raise exception 'Groups can have up to 20 people.';
  end if;

  insert into public.chat_group_members (group_id, user_id) select p_group, unnest(added);

  perform public.notify(m, 'group', 'You were added to a group', 'Say hi in ' || (select name from public.chat_groups where id = p_group), '/chat/g/' || p_group, me)
  from unnest(added) as m;
end;
$$;

create or replace function public.rename_group(p_group uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.chat_groups where id = p_group and owner_id = auth.uid()) then
    raise exception 'Only the group owner can rename it.';
  end if;
  update public.chat_groups set name = public.clean_group_name(p_name) where id = p_group;
end;
$$;

create or replace function public.remove_group_member(p_group uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.chat_groups where id = p_group and owner_id = auth.uid()) then
    raise exception 'Only the group owner can remove people.';
  end if;
  if p_user = auth.uid() then raise exception 'Use Leave group instead.'; end if;
  delete from public.chat_group_members where group_id = p_group and user_id = p_user;
end;
$$;

-- Leaving: the owner's role passes to the longest-standing member; an empty group is deleted.
create or replace function public.leave_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  heir uuid;
begin
  delete from public.chat_group_members where group_id = p_group and user_id = me;

  if not exists (select 1 from public.chat_group_members where group_id = p_group) then
    delete from public.chat_groups where id = p_group;
    return;
  end if;

  if exists (select 1 from public.chat_groups where id = p_group and owner_id = me) then
    select user_id into heir from public.chat_group_members where group_id = p_group order by joined_at limit 1;
    update public.chat_groups set owner_id = heir where id = p_group;
  end if;
end;
$$;

create or replace function public.send_group_message(p_group uuid, p_body text, p_image text default null, p_reply_to bigint default null)
returns public.group_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  msg text := btrim(coalesce(p_body, ''));
  clean text := '';
  inserted public.group_messages;
begin
  perform public.assert_can_chat(me);

  if not public.is_group_member(p_group, me) then raise exception 'You''re not in this group.'; end if;
  if msg = '' and p_image is null then raise exception 'Message is empty.'; end if;
  if char_length(msg) > 1000 then raise exception 'Keep it under 1000 characters.'; end if;

  if (select count(*) from public.group_messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Slow down a little.';
  end if;

  if p_image is not null then
    if (select count(*) from public.group_messages
        where sender_id = me and image is not null and created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'That''s a lot of photos. Try again in a few minutes.';
    end if;
    perform public.chat_image_ok(me, p_image);
  end if;

  if msg <> '' then clean := public.chat_clean(msg); end if;

  if p_reply_to is not null and not exists (
    select 1 from public.group_messages where id = p_reply_to and group_id = p_group
  ) then
    raise exception 'That message is gone.';
  end if;

  insert into public.group_messages (group_id, sender_id, body, image, reply_to)
  values (p_group, me, clean, p_image, p_reply_to)
  returning * into inserted;

  update public.chat_groups set last_message_at = inserted.created_at where id = p_group;
  update public.chat_group_members set last_read_at = inserted.created_at where group_id = p_group and user_id = me;

  return inserted;
end;
$$;

create or replace function public.mark_group_read(p_group uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chat_group_members set last_read_at = now() where group_id = p_group and user_id = auth.uid();
$$;

-- My groups with their newest message and unread count, newest activity first.
create or replace function public.my_groups()
returns table(id uuid, name text, owner_id uuid, member_count integer, last_body text, last_image text, last_sender uuid, last_at timestamptz, unread integer)
language sql
stable security definer
set search_path = ''
as $$
  select g.id, g.name, g.owner_id,
    (select count(*)::integer from public.chat_group_members c where c.group_id = g.id),
    lm.body, lm.image, lm.sender_id, coalesce(lm.created_at, g.created_at),
    (select count(*)::integer from public.group_messages x
      where x.group_id = g.id and x.created_at > m.last_read_at and x.sender_id <> auth.uid())
  from public.chat_group_members m
  join public.chat_groups g on g.id = m.group_id
  left join lateral (
    select body, image, sender_id, created_at from public.group_messages
    where group_id = g.id order by created_at desc limit 1
  ) lm on true
  where m.user_id = auth.uid()
  order by coalesce(lm.created_at, g.created_at) desc;
$$;

revoke all on function public.can_add_to_group(uuid, uuid) from public, anon, authenticated;
-- Used by the chat-images storage policy, which anon requests also evaluate.
revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to anon, authenticated;
revoke all on function public.create_group(text, uuid[]) from public, anon;
revoke all on function public.add_group_members(uuid, uuid[]) from public, anon;
revoke all on function public.rename_group(uuid, text) from public, anon;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.send_group_message(uuid, text, text, bigint) from public, anon;
revoke all on function public.mark_group_read(uuid) from public, anon;
revoke all on function public.my_groups() from public, anon;
grant execute on function public.create_group(text, uuid[]), public.add_group_members(uuid, uuid[]),
  public.rename_group(uuid, text), public.remove_group_member(uuid, uuid), public.leave_group(uuid),
  public.send_group_message(uuid, text, text, bigint), public.mark_group_read(uuid), public.my_groups()
  to authenticated;
