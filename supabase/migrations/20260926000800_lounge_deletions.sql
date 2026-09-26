-- Deleting a lounge message now reaches everyone live. The message row can't
-- carry that (people can't read deleted rows, so realtime drops the update),
-- so each delete also lands here, where everyone signed in can see it.

create table if not exists public.lounge_deletions (
  message_id bigint primary key references public.lounge_messages (id) on delete cascade,
  deleted_at timestamptz not null default now()
);

alter table public.lounge_deletions enable row level security;

drop policy if exists "signed-in users see lounge deletions" on public.lounge_deletions;
create policy "signed-in users see lounge deletions"
  on public.lounge_deletions for select
  to authenticated
  using (true);

revoke insert, update, delete, truncate on public.lounge_deletions from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lounge_deletions'
  ) then
    alter publication supabase_realtime add table public.lounge_deletions;
  end if;
end $$;

create or replace function public.admin_delete_lounge_message(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard('delete_lounge_message', p_id::text,
    (select json_build_object('sender', sender_id, 'body', left(body, 200), 'image', image is not null)::jsonb
     from public.lounge_messages where id = p_id));

  update public.lounge_messages set deleted = true where id = p_id;

  insert into public.lounge_deletions (message_id)
  select p_id where exists (select 1 from public.lounge_messages where id = p_id)
  on conflict do nothing;
end;
$$;
