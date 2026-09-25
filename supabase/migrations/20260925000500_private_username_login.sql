-- Username login without exposing emails: the email is only returned when the
-- password is correct, so the only person who ever sees it is the account owner.
-- Failed attempts are throttled per username to stop password guessing.

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  username_key text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_key_idx
  on public.login_attempts (username_key, attempted_at desc);

-- No policies: nothing outside the function below can read or write this table.
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

create or replace function public.email_for_login(p_username text, p_password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  key text := lower(btrim(coalesce(p_username, '')));
  stored_hash text;
  found_email text;
begin
  if key = '' or coalesce(p_password, '') = '' then
    return null;
  end if;

  delete from public.login_attempts
  where username_key = key and attempted_at < now() - interval '1 day';

  if (select count(*) from public.login_attempts
      where username_key = key and not succeeded
        and attempted_at > now() - interval '15 minutes') >= 8 then
    raise exception 'Too many attempts. Wait 15 minutes, or log in with your email.';
  end if;

  select u.encrypted_password, u.email
  into stored_hash, found_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = key
  limit 1;

  -- Returns without raising so the attempt row is kept (a raise would roll it back).
  if stored_hash is null
     or extensions.crypt(p_password, stored_hash) <> stored_hash then
    insert into public.login_attempts (username_key, succeeded) values (key, false);
    return null;
  end if;

  insert into public.login_attempts (username_key, succeeded) values (key, true);

  return found_email;
end;
$$;

revoke all on function public.email_for_login(text, text) from public;
grant execute on function public.email_for_login(text, text) to anon, authenticated;
