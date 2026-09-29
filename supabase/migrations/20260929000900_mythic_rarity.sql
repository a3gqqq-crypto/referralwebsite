-- Mythic: a rarity above legendary. Early Supporter is the first.
alter table public.cosmetics drop constraint if exists cosmetics_rarity_check;
alter table public.cosmetics add constraint cosmetics_rarity_check
  check (rarity in ('common', 'rare', 'epic', 'legendary', 'mythic'));

update public.cosmetics set rarity = 'mythic' where id = 'badge-early-supporter';
