-- Event leaderboards count only referrals made during the event window, so a new
-- round starts everyone at zero and finished rounds keep their final standings.
-- SECURITY DEFINER because referrals RLS hides other users' rows; only counts leave.

create or replace function public.event_standings(
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
  equipped_badges text[]
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
    p.equipped_badges
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
