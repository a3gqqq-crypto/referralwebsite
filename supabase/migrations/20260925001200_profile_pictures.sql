-- Profile pictures: pick a built-in animal or upload your own.
-- profiles.avatar is 'builtin:<id>' or 'upload:<user id>/<file>'; null = initial letter.

alter table public.profiles
  add column if not exists avatar text
  check (
    avatar is null
    or avatar ~ '^builtin:[a-z]{2,20}$'
    or avatar ~ '^upload:[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg|png)$'
  );

-- ---------------------------------------------------------------
-- Storage: public bucket, each user writes only inside their own folder
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: upload to own folder" on storage.objects;
create policy "avatars: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: list own folder or admin" on storage.objects;
create policy "avatars: list own folder or admin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "avatars: delete own files or admin" on storage.objects;
create policy "avatars: delete own files or admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------
-- Setting your picture
-- ---------------------------------------------------------------

create or replace function public.set_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  path text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_avatar is null then
    update public.profiles set avatar = null where id = me;
    return;
  end if;

  if p_avatar like 'builtin:%' then
    if substr(p_avatar, 9) <> all (array['fox', 'cat', 'panda', 'owl', 'frog', 'bear', 'bunny', 'penguin']) then
      raise exception 'Unknown picture.';
    end if;
  elsif p_avatar like 'upload:%' then
    path := substr(p_avatar, 8);

    if split_part(path, '/', 1) <> me::text then
      raise exception 'That picture isn''t yours.';
    end if;

    if not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = path) then
      raise exception 'Upload the picture first.';
    end if;
  else
    raise exception 'Unknown picture.';
  end if;

  update public.profiles set avatar = p_avatar where id = me;
end;
$$;

revoke all on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;

create or replace function public.admin_clear_avatar(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('clear_avatar', p_user::text,
    json_build_object('user', p_user, 'avatar', (select avatar from public.profiles where id = p_user))::jsonb);

  update public.profiles set avatar = null where id = p_user;
end;
$$;

revoke all on function public.admin_clear_avatar(uuid) from public, anon;
grant execute on function public.admin_clear_avatar(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Leaderboards carry the picture too
-- ---------------------------------------------------------------

drop function if exists public.event_standings(text, timestamptz, timestamptz);

create function public.event_standings(
  p_event_id text,
  p_starts timestamptz,
  p_ends timestamptz
)
returns table (
  id uuid,
  username text,
  referral_count integer,
  created_at timestamptz,
  equipped_frame text,
  equipped_name text,
  equipped_badges text[],
  xp integer,
  avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    count(r.id)::integer as referral_count,
    p.created_at,
    p.equipped_frame,
    p.equipped_name,
    p.equipped_badges,
    p.xp,
    p.avatar
  from (
    select user_id, min(joined_at) as joined_at
    from public.event_participants
    where event_id = p_event_id
    group by user_id
  ) ep
  join public.profiles p on p.id = ep.user_id
  left join public.referrals r
    on r.inviter_id = p.id
   and r.created_at >= p_starts
   and r.created_at <= p_ends
  group by p.id, ep.joined_at
  order by count(r.id) desc, ep.joined_at asc;
$$;

revoke all on function public.event_standings(text, timestamptz, timestamptz) from public;
grant execute on function public.event_standings(text, timestamptz, timestamptz) to anon, authenticated;

drop function if exists public.streak_standings(text, timestamptz, timestamptz);

create function public.streak_standings(
  p_event_id text,
  p_starts timestamptz,
  p_ends timestamptz
)
returns table (
  id uuid,
  username text,
  best_streak integer,
  checkin_days integer,
  created_at timestamptz,
  equipped_frame text,
  equipped_name text,
  equipped_badges text[],
  xp integer,
  avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  with players as (
    select user_id, min(joined_at) as joined_at
    from public.event_participants
    where event_id = p_event_id
    group by user_id
  ),
  days as (
    select e.user_id, e.ref::date as day
    from public.xp_events e
    join players pl on pl.user_id = e.user_id
    where e.reason = 'checkin'
      and e.ref::date between (p_starts at time zone 'UTC')::date
                          and (p_ends at time zone 'UTC')::date
  ),
  runs as (
    select user_id, count(*) as len, max(day) as reached
    from (
      select user_id, day, day - (row_number() over (partition by user_id order by day))::integer as grp
      from days
    ) grouped
    group by user_id, grp
  ),
  best as (
    select distinct on (user_id) user_id, len, reached
    from runs
    order by user_id, len desc, reached asc
  ),
  totals as (
    select user_id, count(*) as total from days group by user_id
  )
  select
    p.id,
    p.username,
    coalesce(b.len, 0)::integer,
    coalesce(t.total, 0)::integer,
    p.created_at,
    p.equipped_frame,
    p.equipped_name,
    p.equipped_badges,
    p.xp,
    p.avatar
  from players pl
  join public.profiles p on p.id = pl.user_id
  left join best b on b.user_id = pl.user_id
  left join totals t on t.user_id = pl.user_id
  order by coalesce(b.len, 0) desc, coalesce(t.total, 0) desc, b.reached asc nulls last, pl.joined_at asc;
$$;

revoke all on function public.streak_standings(text, timestamptz, timestamptz) from public;
grant execute on function public.streak_standings(text, timestamptz, timestamptz) to anon, authenticated;
