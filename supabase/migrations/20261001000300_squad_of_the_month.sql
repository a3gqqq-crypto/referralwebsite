-- Squad of the Month: the squad with the most weekly Squad Wars wins in a
-- calendar month (a week counts for the month its Sunday is in). Ties go to
-- the higher total score across those wins. Members get a Mythic badge and a
-- notification; the owner pays the cash prize (app_settings.squad_month_prize).

create table if not exists public.squad_month_champions (
  month date primary key,
  squad_id uuid references public.squads(id) on delete set null,
  squad_name text not null,
  squad_tag text not null,
  wins integer not null,
  prize text,
  created_at timestamptz not null default now()
);
alter table public.squad_month_champions enable row level security;
drop policy if exists "month champions are public" on public.squad_month_champions;
create policy "month champions are public" on public.squad_month_champions for select to anon, authenticated using (true);
grant select on public.squad_month_champions to anon, authenticated;

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule, active)
values ('badge-squad-month', 'badge', 'Squad of the Month', 'mythic', null, '{"manual": true}', true)
on conflict (id) do nothing;

-- The prize is public so the Squads page can show it.
insert into public.app_settings (key, value) values ('squad_month_prize', '$30')
on conflict (key) do update set value = excluded.value, updated_at = now();

drop policy if exists "signed-in users read public settings" on public.app_settings;
create policy "signed-in users read public settings" on public.app_settings
  for select to authenticated using (key = any (array['crypto_address', 'squad_month_prize']));

-- Weekly wins per squad in a month (default: this month, UTC).
create or replace function public.squad_month_wins(p_month date default null)
returns table(id uuid, name text, tag text, emblem text, color text, wins integer, score integer)
language sql
stable security definer
set search_path = ''
as $$
  select s.id, s.name, s.tag, s.emblem, s.color, count(*)::integer, sum(c.score)::integer
  from public.squad_champions c
  join public.squads s on s.id = c.squad_id
  where date_trunc('month', c.week_start + 6)::date
        = coalesce(p_month, date_trunc('month', now() at time zone 'UTC')::date)
  group by s.id
  order by 6 desc, 7 desc, min(c.week_start) asc;
$$;

grant execute on function public.squad_month_wins(date) to anon, authenticated;

create or replace function public.award_squad_of_month()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_month date := (date_trunc('month', now() at time zone 'UTC') - interval '1 month')::date;
  winner record;
  prize text := (select value from public.app_settings where key = 'squad_month_prize');
  member uuid;
begin
  if exists (select 1 from public.squad_month_champions where month = last_month) then return; end if;

  select * into winner from public.squad_month_wins(last_month) limit 1;
  if winner.id is null then return; end if;

  insert into public.squad_month_champions (month, squad_id, squad_name, squad_tag, wins, prize)
  values (last_month, winner.id, winner.name, winner.tag, winner.wins, prize);

  for member in select user_id from public.squad_members where squad_id = winner.id loop
    insert into public.user_cosmetics (user_id, cosmetic_id, source)
    values (member, 'badge-squad-month', 'earned')
    on conflict do nothing;

    perform public.notify(member, 'announcement', '👑 Squad of the Month!',
      winner.name || ' won the most weeks last month' ||
      case when prize is not null and prize <> '' then '. The ' || prize || ' prize is on its way, we''ll contact your squad.' else '.' end,
      '/squads/' || winner.tag, null);
  end loop;
end;
$$;

revoke all on function public.award_squad_of_month() from public, anon, authenticated;

-- Owner can change the advertised prize.
create or replace function public.owner_set_squad_prize(p_prize text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_guard('squad_prize', null, jsonb_build_object('prize', p_prize));
  insert into public.app_settings (key, value) values ('squad_month_prize', left(btrim(coalesce(p_prize, '')), 40))
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.owner_set_squad_prize(text) from public, anon;
grant execute on function public.owner_set_squad_prize(text) to authenticated;

-- 1st of each month, after Monday's weekly award could have run (00:05).
select cron.unschedule('squad-of-month') where exists (select 1 from cron.job where jobname = 'squad-of-month');
select cron.schedule('squad-of-month', '15 0 1 * *', $$select public.award_squad_of_month()$$);
