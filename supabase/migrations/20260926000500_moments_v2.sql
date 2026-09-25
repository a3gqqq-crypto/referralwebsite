-- Moments v2: private by default, open counts, and a "they opened it" notification.
--
-- Before this, any visitor could list every active Moment (and read the
-- messages) straight from the table. Now a Moment is only readable through
-- get_moment(id) with its link; creators can still list their own.

alter table public.moments
  add column if not exists views integer not null default 0,
  add column if not exists first_opened_at timestamptz;

alter table public.moments drop constraint if exists moments_text_lengths;
alter table public.moments
  add constraint moments_text_lengths check (
    char_length(coalesce(message, '')) <= 500
    and char_length(coalesce(from_name, '')) <= 60
    and char_length(coalesce(to_name, '')) <= 60
    and coalesce(template, 'special') ~ '^[a-z]{2,20}$'
  ) not valid;

drop policy if exists "Public can view active moments" on public.moments;
drop policy if exists "Creators read their own moments" on public.moments;
create policy "Creators read their own moments"
  on public.moments for select
  to authenticated
  using (creator_id = auth.uid());

-- Read one Moment by its link. Expired ones come back flagged, without the message.
create or replace function public.get_moment(p_id text)
returns table (
  id text,
  creator_username text,
  from_name text,
  to_name text,
  message text,
  template text,
  created_at timestamptz,
  expires_at timestamptz,
  expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.creator_username,
    m.from_name,
    m.to_name,
    case when m.expires_at > now() then m.message end,
    m.template,
    m.created_at,
    m.expires_at,
    m.expires_at <= now()
  from public.moments m
  where m.id = p_id;
$$;

revoke all on function public.get_moment(text) from public;
grant execute on function public.get_moment(text) to anon, authenticated;

-- Count an open (not by the creator). The first open notifies the creator.
create or replace function public.open_moment(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.moments;
begin
  select * into m from public.moments where id = p_id and expires_at > now();

  if m.id is null or m.creator_id is not distinct from auth.uid() then
    return;
  end if;

  update public.moments
  set views = views + 1,
      first_opened_at = coalesce(first_opened_at, now())
  where id = p_id;

  if m.first_opened_at is null and m.creator_id is not null then
    perform public.notify(
      m.creator_id, 'moment_open',
      coalesce(nullif(btrim(m.to_name), ''), 'Someone') || ' opened your Moment 💌',
      'They just saw it. Make another?',
      '/moments'
    );
  end if;
end;
$$;

revoke all on function public.open_moment(text) from public;
grant execute on function public.open_moment(text) to anon, authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('referral', 'passed', 'level', 'friend_request', 'friend_accept', 'gift', 'payout', 'moment_open'));
