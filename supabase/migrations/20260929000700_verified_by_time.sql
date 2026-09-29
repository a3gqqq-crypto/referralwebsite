-- The Verified tick evolves with real time subscribed, not months bought:
-- buying 12 months at once still starts at Bronze and levels up as the days
-- pass. verified_since = when the current unbroken subscription started.

alter table public.profiles add column if not exists verified_since timestamptz;
grant select (verified_since) on public.profiles to anon, authenticated;

-- Existing members: their run started when they first paid.
update public.profiles
set verified_since = verified_until - (verified_months * interval '30 days')
where verified_until is not null and verified_since is null;

create or replace function public.extend_verified(p_user uuid, p_months integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  until timestamptz;
  since timestamptz;
begin
  select verified_until, verified_since into until, since from public.profiles where id = p_user;

  -- New, or lapsed for more than 30 days: the clock (and the tick) starts over.
  if until is null or since is null or until < now() - interval '30 days' then
    since := now();
  end if;

  update public.profiles
  set verified_since = since,
      verified_months = coalesce(verified_months, 0) + p_months,  -- total bought, for records
      verified_until = greatest(coalesce(until, now()), now()) + (p_months * interval '30 days')
  where id = p_user;

  perform public.notify(
    p_user, 'gift', 'You''re Verified ✓',
    'Your tick is live for the next ' || (p_months * 30) || ' days. It levels up every month you stay verified.',
    '/shop', null
  );
end;
$$;
revoke all on function public.extend_verified(uuid, integer) from public, anon, authenticated;
