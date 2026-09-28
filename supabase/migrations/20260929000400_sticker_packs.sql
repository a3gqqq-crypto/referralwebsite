-- Sticker packs: premium chat stickers. Free stickers need nothing; stickers
-- listed in sticker_premium need their pack.

alter table public.cosmetics drop constraint if exists cosmetics_type_check;
alter table public.cosmetics add constraint cosmetics_type_check
  check (type in ('frame', 'name', 'banner', 'badge', 'avatar', 'emote', 'sticker'));

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('stickers-savage',    'sticker', 'Savage',    'rare', 249, null),
  ('stickers-wholesome', 'sticker', 'Wholesome', 'rare', 249, null)
on conflict (id) do nothing;

create table if not exists public.sticker_premium (
  sticker_id text primary key,
  cosmetic_id text not null references public.cosmetics (id) on delete cascade
);

alter table public.sticker_premium enable row level security;
drop policy if exists "sticker premium is public" on public.sticker_premium;
create policy "sticker premium is public" on public.sticker_premium for select to anon, authenticated using (true);

insert into public.sticker_premium (sticker_id, cosmetic_id) values
  ('skillissue', 'stickers-savage'),
  ('ratio', 'stickers-savage'),
  ('cope', 'stickers-savage'),
  ('nocap', 'stickers-savage'),
  ('frfr', 'stickers-savage'),
  ('slay', 'stickers-savage'),
  ('proud', 'stickers-wholesome'),
  ('hug', 'stickers-wholesome'),
  ('missu', 'stickers-wholesome'),
  ('gotthis', 'stickers-wholesome'),
  ('bestie', 'stickers-wholesome'),
  ('ily', 'stickers-wholesome')
on conflict (sticker_id) do update set cosmetic_id = excluded.cosmetic_id;

-- Emotes and premium stickers both need to be owned to send.
create or replace function public.check_emote_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  emote text;
  sticker text;
  pack text;
begin
  if new.body ~ '^::sticker:' then
    sticker := substring(new.body from '^::sticker:([a-z]+)::$');
    if sticker is null then
      raise exception 'Unknown sticker.';
    end if;

    select cosmetic_id into pack from public.sticker_premium where sticker_id = sticker;

    if pack is not null and not exists (
      select 1 from public.user_cosmetics where user_id = new.sender_id and cosmetic_id = pack
    ) then
      raise exception 'Get that sticker pack in the shop first.';
    end if;

    return new;
  end if;

  if new.body !~ '^::emote:' then
    return new;
  end if;

  emote := substring(new.body from '^::emote:([a-z]+)::$');

  if emote is null then
    raise exception 'Unknown emote.';
  end if;

  if emote in ('wave', 'laugh', 'gg') then
    return new;
  end if;

  if not exists (select 1 from public.cosmetics where id = 'emote-' || emote and type = 'emote') then
    raise exception 'Unknown emote.';
  end if;

  if not exists (
    select 1 from public.user_cosmetics where user_id = new.sender_id and cosmetic_id = 'emote-' || emote
  ) then
    raise exception 'Get that emote in the shop first.';
  end if;

  return new;
end;
$$;
revoke all on function public.check_emote_message() from public, anon, authenticated;
