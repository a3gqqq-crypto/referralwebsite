-- 12 more shop items (two "Exclusive": shop-only legendaries).

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('frame-sakura',   'frame',  'Sakura',      'rare',      199, null),
  ('frame-neon',     'frame',  'Neon',        'epic',      299, null),
  ('frame-galaxy',   'frame',  'Galaxy',      'epic',      349, null),
  ('frame-inferno',  'frame',  'Inferno',     'legendary', 599, null),
  ('name-sakura',    'name',   'Sakura',      'rare',      149, null),
  ('name-neon',      'name',   'Neon',        'epic',      249, null),
  ('name-rainbow',   'name',   'Prism',       'legendary', 499, null),
  ('banner-sakura',  'banner', 'Sakura',      'rare',      149, null),
  ('banner-neon',    'banner', 'Synthwave',   'epic',      249, null),
  ('banner-galaxy',  'banner', 'Galaxy',      'epic',      299, null),
  ('badge-bolt',     'badge',  'Quick',       'rare',       99, null),
  ('badge-rocket',   'badge',  'To the moon', 'epic',      149, null)
on conflict (id) do nothing;
