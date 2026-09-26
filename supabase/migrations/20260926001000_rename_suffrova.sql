-- The site is now Suffrova (was Vexora). Renames the name in stored text and
-- in the functions that write it.

update public.events
set title = replace(title, 'Vexora', 'Suffrova'),
    subtitle = replace(subtitle, 'Vexora', 'Suffrova'),
    description = replace(description, 'Vexora', 'Suffrova')
where title ilike '%vexora%' or subtitle ilike '%vexora%' or description ilike '%vexora%';

update public.notifications
set title = replace(title, 'Vexora', 'Suffrova'),
    body = replace(body, 'Vexora', 'Suffrova')
where title ilike '%vexora%' or body ilike '%vexora%';

-- Re-create the functions that contain the old name with the new one.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_grant_cosmetic', 'ensure_streak_events')
      and p.prosrc like '%Vexora%'
  loop
    execute replace(pg_get_functiondef(fn.oid), 'Vexora', 'Suffrova');
  end loop;

  -- Display names can't pose as the site under either name.
  select p.oid into fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'name_blocked';

  execute replace(pg_get_functiondef(fn.oid), '^(vexora|admin', '^(vexora|suffrova|admin');
end $$;
