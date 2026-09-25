-- "Happening now" feed on Home: recent public-safe activity from the last 30 days.

create or replace function public.activity_feed(p_limit integer default 12)
returns table (kind text, actor text, target text, detail text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select 'join'::text, pi.username, pv.username, null::text, r.created_at
    from public.referrals r
    join public.profiles pi on pi.id = r.inviter_id
    join public.profiles pv on pv.id = r.invited_user_id
    where r.created_at > now() - interval '30 days'
      and pi.username is not null and pv.username is not null

    union all

    select 'new', p.username, null, null, p.created_at
    from public.profiles p
    where p.created_at > now() - interval '30 days'
      and p.username is not null
      and not exists (select 1 from public.referrals r where r.invited_user_id = p.id)

    union all

    select 'level', p.username, null, substring(n.title from 'Level ([0-9]+)'), n.created_at
    from public.notifications n
    join public.profiles p on p.id = n.user_id
    where n.kind = 'level' and n.created_at > now() - interval '30 days'
      and coalesce(substring(n.title from 'Level ([0-9]+)')::integer, 0) >= 3

    union all

    select 'passed', a.username, b.username, null, n.created_at
    from public.notifications n
    join public.profiles a on a.id = n.actor_id
    join public.profiles b on b.id = n.user_id
    where n.kind = 'passed' and n.created_at > now() - interval '30 days'

    union all

    select 'moment', coalesce(p.username, m.creator_username), null, null, m.created_at
    from public.moments m
    left join public.profiles p on p.id = m.creator_id
    where m.created_at > now() - interval '30 days'
      and coalesce(p.username, m.creator_username) is not null
  ) feed (kind, actor, target, detail, created_at)
  order by created_at desc
  limit least(greatest(p_limit, 1), 30);
$$;

revoke all on function public.activity_feed(integer) from public, anon;
grant execute on function public.activity_feed(integer) to authenticated;
