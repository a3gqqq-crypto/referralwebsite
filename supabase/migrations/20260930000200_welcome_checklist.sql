-- One-time welcome checklist for new members. Each step pays XP once, and
-- finishing all of them pays a bonus. Everything together lands past Level 3
-- (the Lounge unlock), but not without making a friend, chatting and inviting.

alter table public.xp_events drop constraint if exists xp_events_reason_check;
alter table public.xp_events add constraint xp_events_reason_check check (reason = any (array[
  'referral', 'welcome', 'checkin', 'event', 'moment', 'friend', 'lounge', 'quest', 'instagram', 'starter'
]));

create or replace function public.welcome_step_done(p_user uuid, p_step text)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select case p_step
    when 'avatar' then exists (select 1 from public.profiles where id = p_user and body_avatar is not null)
    when 'picture' then exists (select 1 from public.profiles where id = p_user and avatar is not null)
    when 'bio' then exists (select 1 from public.profiles where id = p_user and nullif(trim(bio), '') is not null)
    when 'checkin' then exists (select 1 from public.profiles where id = p_user and last_checkin is not null)
    when 'friend' then exists (select 1 from public.friendships
                               where (user_a = p_user or user_b = p_user) and status = 'accepted')
    when 'message' then exists (select 1 from public.direct_messages where sender_id = p_user)
                     or exists (select 1 from public.lounge_messages where sender_id = p_user)
    when 'invite' then exists (select 1 from public.referrals where inviter_id = p_user)
    else false
  end;
$$;

create or replace function public.my_welcome_steps()
returns table(id text, title text, reward integer, done boolean, claimed boolean)
language sql
stable security definer
set search_path = ''
as $$
  select s.id, s.title, s.reward,
         public.welcome_step_done(auth.uid(), s.id),
         exists (select 1 from public.xp_events x
                 where x.user_id = auth.uid() and x.reason = 'starter' and x.ref = s.id)
  from (values
    (1, 'avatar', 'Make your 3D avatar', 30),
    (2, 'picture', 'Add a profile picture', 15),
    (3, 'bio', 'Write a short bio', 10),
    (4, 'checkin', 'Do your first daily check-in', 15),
    (5, 'friend', 'Make a friend', 30),
    (6, 'message', 'Send your first message', 20),
    (7, 'invite', 'Invite someone', 50),
    (8, 'all', 'Finish everything', 80)
  ) s(n, id, title, reward)
  where auth.uid() is not null
  order by s.n;
$$;

create or replace function public.claim_welcome_step(p_step text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  reward integer;
  granted integer;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  select s.reward into reward
  from public.my_welcome_steps() s
  where s.id = p_step;

  if reward is null then
    raise exception 'Unknown step.';
  end if;

  if p_step = 'all' then
    if exists (select 1 from public.my_welcome_steps() s where s.id <> 'all' and not s.claimed) then
      raise exception 'Claim every step first.';
    end if;
  elsif not public.welcome_step_done(me, p_step) then
    raise exception 'Finish this step first.';
  end if;

  granted := public.award_xp(me, reward, 'starter', p_step);

  if granted = 0 then
    raise exception 'Already claimed.';
  end if;

  return granted;
end;
$$;

revoke all on function public.welcome_step_done(uuid, text) from public, anon, authenticated;
revoke all on function public.my_welcome_steps() from public, anon;
revoke all on function public.claim_welcome_step(text) from public, anon;
grant execute on function public.my_welcome_steps() to authenticated;
grant execute on function public.claim_welcome_step(text) to authenticated;
