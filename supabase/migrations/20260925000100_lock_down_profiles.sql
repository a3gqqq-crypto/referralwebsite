-- Profiles are only ever written by the signup trigger and SECURITY DEFINER RPCs.
-- Direct client writes let users set their own referral_count, rename past moderation,
-- and equip cosmetics they don't own.

drop policy if exists "Users can update their own profile" on public.profiles;

revoke insert, update, delete on public.profiles from anon, authenticated;

-- Moments credit referrals to creator_username, so derive it instead of trusting the client.
create or replace function public.set_moment_creator_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.creator_username := (
    select p.username from public.profiles p where p.id = new.creator_id
  );
  return new;
end;
$$;

revoke all on function public.set_moment_creator_username() from public, anon, authenticated;

drop trigger if exists moments_set_creator_username on public.moments;
create trigger moments_set_creator_username
  before insert on public.moments
  for each row execute function public.set_moment_creator_username();
