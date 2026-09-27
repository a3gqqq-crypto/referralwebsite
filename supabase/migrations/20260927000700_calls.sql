-- Voice/video calls (media runs through LiveKit; this tracks who may join).
-- There's always-open "Lounge voice", plus private group calls: anyone in
-- a call can invite their own friends. The call-token edge function checks
-- these tables before handing out a LiveKit token.

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.call_members (
  call_id uuid not null references public.calls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (call_id, user_id)
);

create index if not exists call_members_user_idx on public.call_members (user_id, created_at desc);

alter table public.calls enable row level security;
alter table public.call_members enable row level security;

create or replace function public.is_call_member(p_call uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.call_members where call_id = p_call and user_id = auth.uid());
$$;

revoke all on function public.is_call_member(uuid) from public, anon;
grant execute on function public.is_call_member(uuid) to authenticated;

drop policy if exists "members see their calls" on public.calls;
create policy "members see their calls"
  on public.calls for select
  to authenticated
  using (public.is_call_member(id));

drop policy if exists "members see who's in their calls" on public.call_members;
create policy "members see who's in their calls"
  on public.call_members for select
  to authenticated
  using (public.is_call_member(call_id));

revoke insert, update, delete, truncate on public.calls, public.call_members from anon, authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout', 'moment_open', 'announcement', 'call'));

-- A call is live until the host ends it, or 12 hours after it started.
create or replace function public.call_is_live(p_call uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.calls
    where id = p_call and ended_at is null and created_at > now() - interval '12 hours'
  );
$$;

revoke all on function public.call_is_live(uuid) from public, anon;
grant execute on function public.call_is_live(uuid) to authenticated;

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where user_a = least(p_a, p_b) and user_b = greatest(p_a, p_b) and status = 'accepted'
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- Adds a friend of the caller to a call and rings them (bell notification).
create or replace function public.add_to_call(p_call uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_name text;
begin
  if not public.are_friends(me, p_user) then
    raise exception 'You can only invite friends.';
  end if;

  if public.is_blocked_between(me, p_user) then
    raise exception 'You can''t invite this person.';
  end if;

  insert into public.call_members (call_id, user_id, invited_by)
  values (p_call, p_user, me)
  on conflict do nothing;

  if found then
    select coalesce(display_name, username) into my_name from public.profiles where id = me;
    perform public.notify(p_user, 'call', '📞 ' || coalesce(my_name, 'A friend') || ' is calling you',
                          'Tap to join the call.', '/call/' || p_call::text, me);
  end if;
end;
$$;

revoke all on function public.add_to_call(uuid, uuid) from public, anon, authenticated;

create or replace function public.start_call(p_invite uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  target uuid;
begin
  perform public.assert_can_chat(me);

  if (select count(*) from public.calls where host_id = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'That''s a lot of calls. Try again in a bit.';
  end if;

  if coalesce(array_length(p_invite, 1), 0) > 12 then
    raise exception 'Invite up to 12 friends at a time.';
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

create or replace function public.invite_to_call(p_call uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_call_member(p_call) then
    raise exception 'You''re not in this call.';
  end if;

  if not public.call_is_live(p_call) then
    raise exception 'This call has ended.';
  end if;

  if (select count(*) from public.call_members where call_id = p_call) >= 25 then
    raise exception 'This call is full.';
  end if;

  perform public.add_to_call(p_call, p_user);
end;
$$;

revoke all on function public.invite_to_call(uuid, uuid) from public, anon;
grant execute on function public.invite_to_call(uuid, uuid) to authenticated;

create or replace function public.end_call(p_call uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls set ended_at = now()
  where id = p_call and host_id = auth.uid() and ended_at is null;

  if not found then
    raise exception 'Only the person who started the call can end it.';
  end if;
end;
$$;

revoke all on function public.end_call(uuid) from public, anon;
grant execute on function public.end_call(uuid) to authenticated;
