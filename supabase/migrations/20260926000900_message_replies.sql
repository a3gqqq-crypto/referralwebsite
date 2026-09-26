-- Replies: a message can point at an earlier one in the same chat.

alter table public.lounge_messages
  add column if not exists reply_to bigint references public.lounge_messages (id) on delete set null;

alter table public.direct_messages
  add column if not exists reply_to bigint references public.direct_messages (id) on delete set null;

drop function if exists public.send_lounge_message(text, text);

create function public.send_lounge_message(p_body text, p_image text default null, p_reply_to bigint default null)
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

  if p_reply_to is not null and not exists (
    select 1 from public.lounge_messages where id = p_reply_to and not deleted
  ) then
    raise exception 'That message is gone.';
  end if;

  insert into public.lounge_messages (sender_id, body, image, reply_to) values (me, clean, p_image, p_reply_to)
  returning * into inserted;

  return inserted;
end;
$$;

drop function if exists public.send_direct_message(uuid, text, text);

create function public.send_direct_message(p_recipient uuid, p_body text, p_image text default null, p_reply_to bigint default null)
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

  -- Replies only to a message in this same conversation.
  if p_reply_to is not null and not exists (
    select 1 from public.direct_messages
    where id = p_reply_to
      and ((sender_id = me and recipient_id = p_recipient) or (sender_id = p_recipient and recipient_id = me))
  ) then
    raise exception 'That message is gone.';
  end if;

  insert into public.direct_messages (sender_id, recipient_id, body, image, reply_to)
  values (me, p_recipient, clean, p_image, p_reply_to)
  returning * into inserted;

  return inserted;
end;
$$;

revoke all on function public.send_lounge_message(text, text, bigint) from public, anon;
revoke all on function public.send_direct_message(uuid, text, text, bigint) from public, anon;
grant execute on function public.send_lounge_message(text, text, bigint) to authenticated;
grant execute on function public.send_direct_message(uuid, text, text, bigint) to authenticated;
