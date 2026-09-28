-- Scene banners: backdrops your 3D avatar stands in on your profile.
insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('banner-beach',   'banner', 'Beach day',    'rare',      349, null),
  ('banner-city',    'banner', 'City nights',  'epic',      399, null),
  ('banner-gaming',  'banner', 'Gaming setup', 'epic',      399, null),
  ('banner-stadium', 'banner', 'Stadium',      'legendary', 499, null)
on conflict (id) do nothing;
