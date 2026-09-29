-- Verified expiry reminders (instead of wallet auto-pay): a notification
-- (and phone push, via the existing notifications trigger) 7, 3 and 1 days
-- before Verified ends, and one when it ends. Runs every hour with pg_cron.

create extension if not exists pg_cron;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout',
                  'moment_open', 'announcement', 'call', 'membership'));

-- Last reminder sent for the current paid period: 7, 3, 1, or 0 (ended).
-- Paying again clears it.
alter table public.profiles add column if not exists verified_reminded integer;

create or replace function public.send_verified_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
  days integer;
  stage integer;
  sent integer := 0;
begin
  for person in
    select id, verified_until, verified_reminded
    from public.profiles
    where verified_until is not null
      and verified_until < now() + interval '7 days'
      and verified_until > now() - interval '1 day'
  loop
    days := ceil(extract(epoch from person.verified_until - now()) / 86400);

    stage := case
      when person.verified_until <= now() then 0
      when days <= 1 then 1
      when days <= 3 then 3
      else 7
    end;

    -- Only send each reminder once (and never go back to an earlier one).
    continue when person.verified_reminded is not null and person.verified_reminded <= stage;

    if stage = 0 then
      perform public.notify(
        person.id, 'membership', 'Your Verified badge ended',
        'Renew within 30 days to keep your badge level. After that it starts again at Bronze.',
        '/shop', null
      );
    else
      perform public.notify(
        person.id, 'membership',
        case when days <= 1 then 'Your Verified ends tomorrow' else 'Your Verified ends in ' || days || ' days' end,
        'Renew now to keep your badge and its level. $7 adds another 30 days.',
        '/shop', null
      );
    end if;

    update public.profiles set verified_reminded = stage where id = person.id;
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;
revoke all on function public.send_verified_reminders() from public, anon, authenticated;

-- Paying again (or a gift) starts the reminders over for the new period.
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

  if until is null or since is null or until < now() - interval '30 days' then
    since := now();
  end if;

  update public.profiles
  set verified_since = since,
      verified_months = coalesce(verified_months, 0) + p_months,
      verified_until = greatest(coalesce(until, now()), now()) + (p_months * interval '30 days'),
      verified_reminded = null
  where id = p_user;

  if now() < timestamptz '2028-01-01 00:00:00+00' then
    insert into public.user_cosmetics (user_id, cosmetic_id, source)
    values (p_user, 'badge-early-supporter', 'earned')
    on conflict do nothing;
  end if;

  perform public.notify(
    p_user, 'gift', 'You''re Verified ✓',
    'Your tick is live for the next ' || (p_months * 30) || ' days. It levels up every month you stay verified.',
    '/shop', null
  );
end;
$$;
revoke all on function public.extend_verified(uuid, integer) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'verified-reminders';
select cron.schedule('verified-reminders', '7 * * * *', 'select public.send_verified_reminders()');
