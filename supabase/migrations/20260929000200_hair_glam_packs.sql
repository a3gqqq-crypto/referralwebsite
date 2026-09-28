-- Trendy hair and Glam packs for the 3D avatar (face shapes, eye shapes,
-- noses, lashes, lipstick and basic makeup are free).

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('avatar-hair', 'avatar', 'Trendy hair', 'rare', 299, null),
  ('avatar-glam', 'avatar', 'Glam',        'epic', 349, null)
on conflict (id) do nothing;

insert into public.avatar_premium (style, part, value, cosmetic_id) values
  ('fb', 'hair', 'wolfcut', 'avatar-hair'),
  ('fb', 'hair', 'spacebuns', 'avatar-hair'),
  ('fb', 'makeup', 'glitter', 'avatar-glam'),
  ('fb', 'makeup', 'stars', 'avatar-glam')
on conflict (style, part, value) do update set cosmetic_id = excluded.cosmetic_id;
