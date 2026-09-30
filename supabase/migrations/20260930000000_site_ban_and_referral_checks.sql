-- Site-wide bans, and referrals that only count once the new account is real.

/* ---------- Site ban ---------- */

alter table public.profiles add column if not exists site_banned boolean not null default false;
grant select (site_banned) on public.profiles to anon, authenticated;

-- Referrals taken away by a ban, so an unban can put them back.
create table if not exists public.referrals_removed (
  invited_user_id uuid primary key,
  inviter_id uuid not null,
  created_at timestamptz not null,
  removed_at timestamptz not null default now()
);
alter table public.referrals_removed enable row level security;

create or replace function public.owner_set_site_ban(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rr record;
begin
  perform public.owner_guard(case when p_banned then 'site_ban' else 'site_unban' end, p_user::text);

  if p_banned and exists (select 1 from public.admins where user_id = p_user) then
    raise exception 'You can''t ban staff. Remove their role first.';
  end if;

  if p_banned then
    update public.profiles set site_banned = true, chat_banned = true where id = p_user;

    -- Block logins and end every session right away.
    update auth.users set banned_until = '2999-01-01' where id = p_user;
    delete from auth.refresh_tokens where user_id = p_user::text;
    delete from auth.sessions where user_id = p_user;

    -- The invite that brought them in stops counting for whoever invited them.
    for rr in delete from public.referrals where invited_user_id = p_user returning inviter_id, created_at loop
      insert into public.referrals_removed (invited_user_id, inviter_id, created_at)
      values (p_user, rr.inviter_id, rr.created_at)
      on conflict (invited_user_id) do nothing;

      -- Also take back the invite XP (an unban gives it back through the trigger).
      update public.profiles
      set referral_count = greatest(coalesce(referral_count, 0) - 1, 0),
          xp = greatest(xp - coalesce((
            select sum(x.amount) from public.xp_events x
            where x.user_id = rr.inviter_id and x.reason = 'referral' and x.ref = p_user::text
          ), 0), 0)
      where id = rr.inviter_id;

      delete from public.xp_events
      where user_id = rr.inviter_id and reason = 'referral' and ref = p_user::text;
    end loop;
  else
    update public.profiles set site_banned = false, chat_banned = false where id = p_user;
    update auth.users set banned_until = null where id = p_user;

    for rr in delete from public.referrals_removed where invited_user_id = p_user returning inviter_id, created_at loop
      insert into public.referrals (inviter_id, invited_user_id, created_at)
      values (rr.inviter_id, p_user, rr.created_at)
      on conflict (invited_user_id) do nothing;

      if found then
        update public.profiles set referral_count = coalesce(referral_count, 0) + 1 where id = rr.inviter_id;
      end if;
    end loop;
  end if;
end;
$$;

revoke all on function public.owner_set_site_ban(uuid, boolean) from public, anon;
grant execute on function public.owner_set_site_ban(uuid, boolean) to authenticated;

-- Banned members drop off event boards.
create or replace function public.event_standings(p_event_id text, p_starts timestamptz, p_ends timestamptz)
returns table(id uuid, username text, referral_count integer, created_at timestamptz, equipped_frame text, equipped_name text, equipped_badges text[], xp integer, avatar text, display_name text)
language sql
stable security definer
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
    p.avatar,
    p.display_name
  from (
    select user_id, min(joined_at) as joined_at
    from public.event_participants
    where event_id = p_event_id
    group by user_id
  ) ep
  join public.profiles p on p.id = ep.user_id and not p.site_banned
  left join public.referrals r
    on r.inviter_id = p.id
   and r.created_at >= p_starts
   and r.created_at <= p_ends
  group by p.id, ep.joined_at
  order by count(r.id) desc, ep.joined_at asc;
$$;

/* ---------- Referrals count once the email is confirmed ---------- */

-- Throwaway inbox services. A referral from one of these never counts.
create or replace function public.is_throwaway_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(lower(coalesce(p_email, '')), '@', 2) = any (array[
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com', 'sharklasers.com',
    'grr.la', '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
    'tempmail.net', 'tempmailo.com', 'tempr.email', 'yopmail.com', 'yopmail.net', 'trashmail.com',
    'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'mintemail.com',
    'throwawaymail.com', 'fakeinbox.com', 'emailondeck.com', 'mohmal.com', 'mail.tm', 'mail.gw',
    'tmpmail.org', 'tmpmail.net', 'moakt.com', 'spamgourmet.com', 'burnermail.io', 'inboxkitten.com',
    'emailfake.com', 'generator.email', 'mailcatch.com', 'mytemp.email', 'tempinbox.com', 'dropmail.me',
    'minuteinbox.com', 'luxusmail.org', 'harakirimail.com', 'mailpoof.com', '1secmail.com', '1secmail.net',
    'cryptogmail.com', 'tempmailaddress.com', 'fexpost.com', 'fextemp.com', 'kzccv.com', 'txcct.com'
  ]);
$$;

-- Creates the referral for a confirmed account (once).
create or replace function public.credit_referral(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter uuid;
  email text;
begin
  select p.referred_by into inviter from public.profiles p where p.id = p_user;
  select u.email into email from auth.users u where u.id = p_user;

  if inviter is null or inviter = p_user or public.is_throwaway_email(email) then
    return;
  end if;

  if exists (select 1 from public.profiles where id = p_user and site_banned) then
    return;
  end if;

  insert into public.referrals (inviter_id, invited_user_id)
  values (inviter, p_user)
  on conflict (invited_user_id) do nothing;

  if found then
    update public.profiles set referral_count = coalesce(referral_count, 0) + 1 where id = inviter;
  end if;
end;
$$;

revoke all on function public.credit_referral(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  referral_username text := nullif(lower(trim(new.raw_user_meta_data ->> 'referral_username')), '');
  inviter uuid;
begin
  if referral_username is not null then
    select id into inviter
    from public.profiles
    where lower(trim(username)) = referral_username
    limit 1;
  end if;

  if inviter = new.id then
    inviter := null;
  end if;

  insert into public.profiles (id, username, referred_by)
  values (new.id, new_username, inviter);

  -- The invite counts when the email is confirmed (right away if it already is).
  if inviter is not null and new.email_confirmed_at is not null then
    perform public.credit_referral(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.credit_referral(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- How many people signed up with my link but haven't confirmed their email yet.
create or replace function public.my_pending_invites()
returns integer
language sql
stable security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.referred_by = auth.uid()
    and u.email_confirmed_at is null
    and not exists (select 1 from public.referrals r where r.invited_user_id = p.id);
$$;

revoke all on function public.my_pending_invites() from public, anon;
grant execute on function public.my_pending_invites() to authenticated;
