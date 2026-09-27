-- Calling the same friend again reuses your live call with them and just
-- rings them again, instead of creating a new call each tap. The new-call
-- limit goes from 10 to 30 an hour (it only counts brand-new calls).

create or replace function public.start_call(p_invite uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  existing uuid;
  target uuid;
  my_name text;
begin
  perform public.assert_can_chat(me);

  if coalesce(array_length(p_invite, 1), 0) > 12 then
    raise exception 'Invite up to 12 friends at a time.';
  end if;

  -- One friend: reuse a live call you already share with them (last 2 hours).
  if coalesce(array_length(p_invite, 1), 0) = 1 then
    target := p_invite[1];

    select c.id into existing
    from public.calls c
    where c.ended_at is null
      and c.created_at > now() - interval '2 hours'
      and exists (select 1 from public.call_members m where m.call_id = c.id and m.user_id = me)
      and exists (select 1 from public.call_members m where m.call_id = c.id and m.user_id = target)
    order by c.created_at desc
    limit 1;

    if existing is not null then
      if not public.are_friends(me, target) or public.is_blocked_between(me, target) then
        raise exception 'You can''t call this person.';
      end if;

      -- Ring them again, at most once every 10 seconds.
      if not exists (
        select 1 from public.notifications
        where user_id = target and kind = 'call' and link = '/call/' || existing::text
          and created_at > now() - interval '10 seconds'
      ) then
        select coalesce(display_name, username) into my_name from public.profiles where id = me;
        perform public.notify(target, 'call', '📞 ' || coalesce(my_name, 'A friend') || ' is calling you',
                              'Tap to join the call.', '/call/' || existing::text, me);
      end if;

      return existing;
    end if;
  end if;

  if (select count(*) from public.calls where host_id = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'That''s a lot of calls. Try again in a bit.';
  end if;

  insert into public.calls (host_id) values (me) returning id into new_id;
  insert into public.call_members (call_id, user_id) values (new_id, me);

  foreach target in array coalesce(p_invite, '{}') loop
    if target <> me then
      perform public.add_to_call(new_id, target);
    end if;
  end loop;

  return new_id;
end;
$$;

revoke all on function public.start_call(uuid[]) from public, anon;
grant execute on function public.start_call(uuid[]) to authenticated;
