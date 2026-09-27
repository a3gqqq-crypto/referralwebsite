-- Technical call events (no audio, no content) so call problems on people's
-- phones can be diagnosed: mic blocked, audio blocked, subscribe failures,
-- disconnect reasons, browser. Kept 3 days; only the service role reads it.

create table if not exists public.call_debug (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  room text,
  event text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists call_debug_created_idx on public.call_debug (created_at desc);

alter table public.call_debug enable row level security;
revoke all on public.call_debug from anon, authenticated;

create or replace function public.log_call_event(p_room text, p_event text, p_detail jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or char_length(coalesce(p_event, '')) not between 1 and 40 then
    return;
  end if;

  if (select count(*) from public.call_debug where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into public.call_debug (user_id, room, event, detail)
  values (auth.uid(), left(p_room, 60), p_event, case when length(p_detail::text) <= 2000 then p_detail end);

  delete from public.call_debug where created_at < now() - interval '3 days';
end;
$$;

revoke all on function public.log_call_event(text, text, jsonb) from public, anon;
grant execute on function public.log_call_event(text, text, jsonb) to authenticated;
