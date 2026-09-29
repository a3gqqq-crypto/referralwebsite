-- 1. Early Supporter badge: anyone who gets Verified before 2028 keeps it
--    forever (like Discord's Early Supporter).
-- 2. The "chat" daily quest counts DMs too: the Lounge needs Level 3 now, so
--    newer members couldn't finish "Send 3 messages in the Lounge".

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('badge-early-supporter', 'badge', 'Early Supporter', 'legendary', null, '{"manual": true}'::jsonb)
on conflict (id) do nothing;

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
      verified_until = greatest(coalesce(until, now()), now()) + (p_months * interval '30 days')
  where id = p_user;

  -- Verified before 2028: Early Supporter badge, kept for good.
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

-- Everyone already verified gets it now.
insert into public.user_cosmetics (user_id, cosmetic_id, source)
select id, 'badge-early-supporter', 'earned' from public.profiles where verified_until is not null
on conflict do nothing;

create or replace function public.quest_info(p_quest text, out title text, out target integer, out reward integer)
language sql
immutable
set search_path = ''
as $$
  select q.title, q.target, q.reward from (values
    ('invite', 'Invite 1 friend', 1, 60),
    ('lounge', 'Send 3 chat messages', 3, 20),
    ('moment', 'Send someone a Moment', 1, 25),
    ('friend', 'Make a new friend', 1, 25),
    ('dm', 'Message a friend', 1, 15),
    ('photo', 'Share a photo in chat', 1, 15)
  ) q(id, title, target, reward)
  where q.id = p_quest;
$$;

create or replace function public.quest_progress(p_user uuid, p_quest text, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case p_quest
    when 'invite' then (select count(*) from public.referrals where inviter_id = p_user and created_at >= p_since)
    when 'lounge' then (select count(*) from public.lounge_messages where sender_id = p_user and created_at >= p_since and not deleted)
                     + (select count(*) from public.direct_messages where sender_id = p_user and created_at >= p_since)
    when 'moment' then (select count(*) from public.moments where creator_id = p_user and created_at >= p_since)
    when 'friend' then (select count(*) from public.friendships
                        where (user_a = p_user or user_b = p_user) and status = 'accepted' and accepted_at >= p_since)
    when 'dm' then (select count(*) from public.direct_messages where sender_id = p_user and created_at >= p_since)
    when 'photo' then (select count(*) from public.lounge_messages where sender_id = p_user and image is not null and created_at >= p_since)
                    + (select count(*) from public.direct_messages where sender_id = p_user and image is not null and created_at >= p_since)
    else 0
  end::integer;
$$;
