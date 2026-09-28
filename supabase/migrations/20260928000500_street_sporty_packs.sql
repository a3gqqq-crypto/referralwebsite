-- Two more avatar packs for the full-body avatar.

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('avatar-street', 'avatar', 'Streetwear', 'epic', 349, null),
  ('avatar-sporty', 'avatar', 'Sporty',     'rare', 299, null)
on conflict (id) do nothing;

insert into public.avatar_premium (style, part, value, cosmetic_id) values
  ('fb', 'top', 'varsity', 'avatar-street'),
  ('fb', 'bottom', 'ripped', 'avatar-street'),
  ('fb', 'hat', 'bucket', 'avatar-street'),
  ('fb', 'top', 'tracksuit', 'avatar-sporty'),
  ('fb', 'bottom', 'trackpants', 'avatar-sporty'),
  ('fb', 'hat', 'headband', 'avatar-sporty')
on conflict (style, part, value) do update set cosmetic_id = excluded.cosmetic_id;
