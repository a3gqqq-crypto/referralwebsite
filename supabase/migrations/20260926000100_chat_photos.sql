-- Photos in chat. Images live in a private bucket; a DM photo can only be read
-- by the two people in that chat, a lounge photo by signed-in members (until
-- it's removed). Lounge photos need level 3 to keep throwaway accounts out.

-- ---------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------

alter table public.lounge_messages
  add column if not exists image text
  check (image is null or image ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg)$');

alter table public.direct_messages
  add column if not exists image text
  check (image is null or image ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg)$');

alter table public.lounge_messages drop constraint if exists lounge_messages_body_check;
alter table public.lounge_messages
  add constraint lounge_messages_body_check
  check (char_length(body) <= 500 and (char_length(body) >= 1 or image is not null));

alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages
  add constraint direct_messages_body_check
  check (char_length(body) <= 1000 and (char_length(body) >= 1 or image is not null));

create unique index if not exists lounge_messages_image_key on public.lounge_messages (image) where image is not null;
create unique index if not exists direct_messages_image_key on public.direct_messages (image) where image is not null;

-- ---------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat images: upload to own folder" on storage.objects;
create policy "chat images: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat images: read if you can see the message" on storage.objects;
create policy "chat images: read if you can see the message"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (select 1 from public.lounge_messages l where l.image = name and not l.deleted)
      or exists (
        select 1 from public.direct_messages d
        where d.image = name and (d.sender_id = auth.uid() or d.recipient_id = auth.uid())
      )
    )
  );

drop policy if exists "chat images: delete own or admin" on storage.objects;
create policy "chat images: delete own or admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------
-- Image checks shared by both send functions
-- ---------------------------------------------------------------

create or replace function public.chat_image_ok(p_user uuid, p_image text)
returns void
language plpgsql
stable
security definer
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
     or exists (select 1 from public.direct_messages where image = p_image) then
    raise exception 'That photo was already sent.';
  end if;
end;
$$;

revoke all on function public.chat_image_ok(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Send functions take an optional photo
-- ---------------------------------------------------------------

drop function if exists public.send_lounge_message(text);

create function public.send_lounge_message(p_body text, p_image text default null)
returns public.lounge_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  msg text := btrim(coalesce(p_body, ''));
  clean text := '';
  inserted public.lounge_messages;
begin
  perform public.assert_can_chat(me);

  if msg = '' and p_image is null then
    raise exception 'Message is empty.';
  end if;

  if char_length(msg) > 500 then
    raise exception 'Keep it under 500 characters.';
  end if;

  if msg ~* '(https?://|www\.|discord\.gg|\m[a-z0-9-]+\.(com|net|org|gg|io|me|xyz|ly|co|app|link)\M)' then
    raise exception 'Links aren''t allowed in the lounge.';
  end if;

  if exists (select 1 from public.lounge_messages
             where sender_id = me and created_at > now() - interval '2 seconds')
     or (select count(*) from public.lounge_messages
         where sender_id = me and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Slow down a little.';
  end if;

  if p_image is not null then
    if (select xp from public.profiles where id = me) < 200 then
      raise exception 'Reach level 3 to post photos in the lounge.';
    end if;

    if (select count(*) from public.lounge_messages
        where sender_id = me and image is not null and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'That''s a lot of photos. Try again in a few minutes.';
    end if;

    perform public.chat_image_ok(me, p_image);
  end if;

  if msg <> '' then
    clean := public.chat_clean(msg);

    if p_image is null and exists (
      select 1 from public.lounge_messages
      where sender_id = me and body = clean and created_at > now() - interval '1 minute'
    ) then
      raise exception 'You just sent that.';
    end if;
  end if;

  insert into public.lounge_messages (sender_id, body, image) values (me, clean, p_image)
  returning * into inserted;

  return inserted;
end;
$$;

drop function if exists public.send_direct_message(uuid, text);

create function public.send_direct_message(p_recipient uuid, p_body text, p_image text default null)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  msg text := btrim(coalesce(p_body, ''));
  clean text := '';
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

  if msg = '' and p_image is null then
    raise exception 'Message is empty.';
  end if;

  if char_length(msg) > 1000 then
    raise exception 'Keep it under 1000 characters.';
  end if;

  if (select count(*) from public.direct_messages
      where sender_id = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Slow down a little.';
  end if;

  if p_image is not null then
    if (select count(*) from public.direct_messages
        where sender_id = me and image is not null and created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'That''s a lot of photos. Try again in a few minutes.';
    end if;

    perform public.chat_image_ok(me, p_image);
  end if;

  if msg <> '' then
    clean := public.chat_clean(msg);
  end if;

  insert into public.direct_messages (sender_id, recipient_id, body, image)
  values (me, p_recipient, clean, p_image)
  returning * into inserted;

  return inserted;
end;
$$;

revoke all on function public.send_lounge_message(text, text) from public, anon;
revoke all on function public.send_direct_message(uuid, text, text) from public, anon;
grant execute on function public.send_lounge_message(text, text) to authenticated;
grant execute on function public.send_direct_message(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------
-- Admin reports include the photo
-- ---------------------------------------------------------------

drop function if exists public.admin_reports(text);

create function public.admin_reports(p_status text default 'open')
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
  message_deleted boolean,
  message_image text
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
    end,
    case r.kind
      when 'lounge' then (select l.image from public.lounge_messages l where l.id = r.message_id)
      when 'dm' then (select d.image from public.direct_messages d where d.id = r.message_id)
    end
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  join public.profiles tp on tp.id = r.reported_user_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;
