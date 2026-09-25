-- Show the affected member's username in the admin log instead of a raw id.

drop function if exists public.admin_log_list(integer);

create function public.admin_log_list(p_limit integer default 100)
returns table (
  id bigint,
  admin text,
  action text,
  target text,
  target_user text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard(null);

  return query
  select
    l.id, p.username, l.action, l.target,
    (select u.username from public.profiles u where u.id::text = coalesce(l.details ->> 'user', l.target)),
    l.details, l.created_at
  from public.admin_log l
  join public.profiles p on p.id = l.admin_id
  order by l.created_at desc
  limit least(greatest(p_limit, 1), 500);
end;
$$;

revoke all on function public.admin_log_list(integer) from public, anon;
grant execute on function public.admin_log_list(integer) to authenticated;
