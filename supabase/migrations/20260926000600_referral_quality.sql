-- Admin-only, read-only: how "real" each player's invites in an event look,
-- so fake accounts can be spotted before prizes are paid. Changes no counts.

create or replace function public.admin_referral_quality(p_event_id text)
returns table (
  user_id uuid,
  invites integer,
  came_back integer,
  did_something integer,
  in_bursts integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ev public.events;
begin
  perform public.admin_guard(null);

  select * into ev from public.events where id = p_event_id;

  if ev.id is null then
    raise exception 'Unknown event.';
  end if;

  return query
  with invites as (
    select r.inviter_id, r.invited_user_id, r.created_at
    from public.referrals r
    where r.created_at between ev.starts_at and ev.ends_at
      and r.inviter_id in (select p.user_id from public.event_participants p where p.event_id = p_event_id)
  )
  select
    i.inviter_id,
    count(*)::integer,
    -- Checked in again on a later day than the day they signed up.
    count(*) filter (where exists (
      select 1 from public.xp_events x
      join public.profiles pr on pr.id = i.invited_user_id
      where x.user_id = i.invited_user_id and x.reason = 'checkin'
        and x.ref::date > (pr.created_at at time zone 'UTC')::date
    ))::integer,
    -- Did anything beyond signing up: chatted, made a friend or Moment, joined an event, invited someone.
    count(*) filter (where exists (
      select 1 from public.xp_events x
      where x.user_id = i.invited_user_id and x.reason in ('lounge', 'friend', 'moment', 'event', 'referral', 'quest')
    ))::integer,
    -- Signed up within 5 minutes of another invite from the same person.
    count(*) filter (where exists (
      select 1 from invites o
      where o.inviter_id = i.inviter_id and o.invited_user_id <> i.invited_user_id
        and o.created_at between i.created_at - interval '5 minutes' and i.created_at + interval '5 minutes'
    ))::integer
  from invites i
  group by i.inviter_id;
end;
$$;

revoke all on function public.admin_referral_quality(text) from public, anon;
grant execute on function public.admin_referral_quality(text) to authenticated;
