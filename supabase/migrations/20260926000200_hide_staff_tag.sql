-- Staff can hide their public Owner/Admin tag. Hidden staff don't appear in the
-- public staff list at all; the admin panel still sees everyone.

alter table public.admins
  add column if not exists hide_tag boolean not null default false;

create or replace function public.staff_list()
returns table (user_id uuid, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id, a.role from public.admins a where not a.hide_tag;
$$;

revoke all on function public.staff_list() from public;
grant execute on function public.staff_list() to anon, authenticated;

-- Your own staff status (null row if you're not staff).
create or replace function public.my_staff_status()
returns table (role text, hide_tag boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.role, a.hide_tag from public.admins a where a.user_id = auth.uid();
$$;

revoke all on function public.my_staff_status() from public, anon;
grant execute on function public.my_staff_status() to authenticated;

create or replace function public.set_staff_tag_hidden(p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admins set hide_tag = coalesce(p_hidden, false) where user_id = auth.uid();

  if not found then
    raise exception 'Only staff have a tag.';
  end if;
end;
$$;

revoke all on function public.set_staff_tag_hidden(boolean) from public, anon;
grant execute on function public.set_staff_tag_hidden(boolean) to authenticated;

-- Full staff list for the admin panel, including hidden tags.
create or replace function public.admin_staff_list()
returns table (user_id uuid, role text, hide_tag boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return query select a.user_id, a.role, a.hide_tag from public.admins a;
end;
$$;

revoke all on function public.admin_staff_list() from public, anon;
grant execute on function public.admin_staff_list() to authenticated;
