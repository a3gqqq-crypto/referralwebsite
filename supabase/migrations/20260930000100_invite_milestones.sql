-- More rewards along the invite road: 1 (badge), 5 (frame), 10 (badge),
-- 25 (name effect), 50 (badge), 100 (mythic badge). claim_earned_cosmetics
-- already hands out anything with a "referrals" rule.

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule)
values
  ('frame-magnet', 'frame', 'Magnet', 'epic', null, '{"referrals": 5}'),
  ('name-influencer', 'name', 'Influencer', 'legendary', null, '{"referrals": 25}'),
  ('badge-hundred', 'badge', 'Icon', 'mythic', null, '{"referrals": 100}')
on conflict (id) do update
set type = excluded.type, name = excluded.name, rarity = excluded.rarity,
    price_cents = excluded.price_cents, earn_rule = excluded.earn_rule, active = true;
