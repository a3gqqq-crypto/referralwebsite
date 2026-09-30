-- Group pictures. Only the group owner can set one. The picture lives in the
-- private chat-images bucket, so only the group's members can see it.

alter table public.chat_groups add column if not exists avatar text;

create or replace function public.set_group_avatar(p_group uuid, p_image text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if not exists (select 1 from public.chat_groups where id = p_group and owner_id = me) then
    raise exception 'Only the group owner can change the picture.';
  end if;

  if p_image is not null then
    if p_image !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg)$' or split_part(p_image, '/', 1) <> me::text then
      raise exception 'That picture isn''t yours.';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'chat-images' and name = p_image) then
      raise exception 'Upload the picture first.';
    end if;
  end if;

  update public.chat_groups set avatar = p_image where id = p_group;
end;
$$;

revoke all on function public.set_group_avatar(uuid, text) from public, anon;
grant execute on function public.set_group_avatar(uuid, text) to authenticated;

-- Members can see their groups' pictures.
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
      or exists (select 1 from public.chat_groups cg
                 where cg.avatar = objects.name and public.is_group_member(cg.id, auth.uid()))
    )
  );

-- my_groups now includes the picture.
drop function if exists public.my_groups();
create function public.my_groups()
returns table(id uuid, name text, owner_id uuid, avatar text, member_count integer, last_body text, last_image text, last_sender uuid, last_at timestamptz, unread integer)
language sql
stable security definer
set search_path = ''
as $$
  select g.id, g.name, g.owner_id, g.avatar,
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

revoke all on function public.my_groups() from public, anon;
grant execute on function public.my_groups() to authenticated;

-- Realtime: picture/name changes refresh members' lists.
do $$
begin
  alter publication supabase_realtime add table public.chat_groups;
exception when duplicate_object then null;
end $$;
