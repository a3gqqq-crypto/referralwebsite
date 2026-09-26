-- Follow @suffrova on Instagram → "Insta Fam" badge + 100 XP, once.
-- Instagram doesn't let a site check follows, so this trusts the person;
-- the reward is small and doesn't touch event rankings.

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule)
values ('badge-insta', 'badge', 'Insta Fam', 'rare', null, '{"manual": true}')
on conflict (id) do nothing;

alter table public.xp_events drop constraint if exists xp_events_reason_check;
alter table public.xp_events
  add constraint xp_events_reason_check
  check (reason in ('referral', 'welcome', 'checkin', 'event', 'moment', 'friend', 'lounge', 'quest', 'instagram'));

create or replace function public.claim_instagram_reward()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  granted integer;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if exists (select 1 from public.user_cosmetics where user_id = me and cosmetic_id = 'badge-insta') then
    return json_build_object('already', true, 'xp', 0);
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  values (me, 'badge-insta', 'earned')
  on conflict do nothing;

  -- award_xp dedupes on (user, reason, ref), so this can only ever pay once.
  granted := public.award_xp(me, 100, 'instagram', 'follow');

  return json_build_object('already', false, 'xp', granted);
end;
$$;

revoke all on function public.claim_instagram_reward() from public, anon;
grant execute on function public.claim_instagram_reward() to authenticated;
