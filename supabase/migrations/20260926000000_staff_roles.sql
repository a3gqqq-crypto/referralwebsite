-- Staff roles: owners and admins get a public tag next to their name.
-- Only owners can add or remove admins; nobody can change their own role.

alter table public.admins
  add column if not exists role text not null default 'admin'
  check (role in ('owner', 'admin'));

update public.admins
set role = 'owner'
where user_id = (select id from public.profiles where username = 'DreamCM');

-- Public: who is staff (ids + role only), so tags can be shown to everyone.
create or replace function public.staff_list()
returns table (user_id uuid, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id, a.role from public.admins a;
$$;

revoke all on function public.staff_list() from public;
grant execute on function public.staff_list() to anon, authenticated;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
begin
  if p_role is not null and p_role not in ('owner', 'admin') then
    raise exception 'Unknown role.';
  end if;

  me := public.admin_guard('set_role', p_user::text, json_build_object('role', p_role)::jsonb);

  if not exists (select 1 from public.admins where user_id = me and role = 'owner') then
    raise exception 'Only owners can change admins.';
  end if;

  if p_user = me then
    raise exception 'You can''t change your own role.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Unknown member.';
  end if;

  if p_role is null then
    delete from public.admins where user_id = p_user;
  else
    insert into public.admins (user_id, role) values (p_user, p_role)
    on conflict (user_id) do update set role = excluded.role;
  end if;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
