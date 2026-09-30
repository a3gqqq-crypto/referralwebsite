-- Halloween drop: three limited cosmetics, on sale until 1 November (UTC).
-- Owners keep them afterwards; the shop just stops selling them.

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule, active)
values
  ('frame-spooky', 'frame', 'Spooky', 'epic', 299, null, true),
  ('name-haunted', 'name', 'Haunted', 'epic', 299, null, true),
  ('banner-haunted', 'banner', 'Haunted night', 'legendary', 399, null, true)
on conflict (id) do update
set type = excluded.type, name = excluded.name, rarity = excluded.rarity,
    price_cents = excluded.price_cents, active = true;

-- Stop selling at midnight UTC on 1 November (checkout requires active items).
select cron.unschedule('halloween-drop-ends') where exists (select 1 from cron.job where jobname = 'halloween-drop-ends');
select cron.schedule(
  'halloween-drop-ends',
  '0 0 1 11 *',
  $$update public.cosmetics set active = false where id in ('frame-spooky', 'name-haunted', 'banner-haunted')$$
);
