-- Avatar maker (4 DiceBear styles) + avatar packs and emotes in the shop.
-- profiles.avatar can now be 'db:{"s":style,"o":{part:value}}'. Premium part
-- values need the matching pack; emote chat messages need the emote.

alter table public.cosmetics drop constraint if exists cosmetics_type_check;
alter table public.cosmetics add constraint cosmetics_type_check
  check (type in ('frame', 'name', 'banner', 'badge', 'avatar', 'emote'));

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('avatar-shades',    'avatar', 'Shades',         'rare',       99, null),
  ('avatar-winter',    'avatar', 'Winter hats',    'rare',       99, null),
  ('avatar-bling',     'avatar', 'Bling',          'rare',       99, null),
  ('avatar-drip',      'avatar', 'Drip tees',      'rare',      149, null),
  ('avatar-kawaii',    'avatar', 'Kawaii',         'epic',      149, null),
  ('avatar-glowbot',   'avatar', 'Glow bot',       'epic',      149, null),
  ('avatar-villain',   'avatar', 'Villain',        'epic',      199, null),
  ('avatar-gradients', 'avatar', 'Gradient skies', 'epic',      199, null),
  ('emote-dance',      'emote',  'Dance',          'rare',       99, null),
  ('emote-love',       'emote',  'Love',           'rare',       99, null),
  ('emote-cry',        'emote',  'Cry',            'rare',       99, null),
  ('emote-rage',       'emote',  'Rage',           'epic',      149, null),
  ('emote-fire',       'emote',  'On fire',        'epic',      149, null),
  ('emote-crown',      'emote',  'Crowned',        'legendary', 299, null)
on conflict (id) do nothing;

alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar is null
  or avatar ~ '^builtin:[a-z]{2,20}$'
  or avatar ~ '^upload:[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(webp|jpg|png)$'
  or (avatar like 'db:{%}' and char_length(avatar) <= 800)
);

create table if not exists public.avatar_premium (
  style text not null,
  part text not null,
  value text not null,
  cosmetic_id text not null references public.cosmetics (id) on delete cascade,
  primary key (style, part, value)
);

alter table public.avatar_premium enable row level security;
drop policy if exists "avatar premium is public" on public.avatar_premium;
create policy "avatar premium is public" on public.avatar_premium for select to anon, authenticated using (true);

insert into public.avatar_premium (style, part, value, cosmetic_id) values
  ('avataaars', 'accessories', 'sunglasses', 'avatar-shades'),
  ('avataaars', 'accessories', 'wayfarers', 'avatar-shades'),
  ('avataaars', 'accessories', 'kurt', 'avatar-shades'),
  ('bigSmile', 'accessories', 'sunglasses', 'avatar-shades'),
  ('avataaars', 'top', 'hat', 'avatar-winter'),
  ('avataaars', 'top', 'winterHat1', 'avatar-winter'),
  ('avataaars', 'top', 'winterHat02', 'avatar-winter'),
  ('avataaars', 'top', 'winterHat03', 'avatar-winter'),
  ('avataaars', 'top', 'winterHat04', 'avatar-winter'),
  ('bigSmile', 'accessories', 'catEars', 'avatar-kawaii'),
  ('bigSmile', 'accessories', 'sailormoonCrown', 'avatar-kawaii'),
  ('bigSmile', 'mouth', 'kawaii', 'avatar-kawaii'),
  ('adventurer', 'features', 'blush', 'avatar-kawaii'),
  ('adventurer', 'earrings', 'variant01', 'avatar-bling'),
  ('adventurer', 'earrings', 'variant02', 'avatar-bling'),
  ('adventurer', 'earrings', 'variant03', 'avatar-bling'),
  ('adventurer', 'earrings', 'variant04', 'avatar-bling'),
  ('adventurer', 'earrings', 'variant05', 'avatar-bling'),
  ('adventurer', 'earrings', 'variant06', 'avatar-bling'),
  ('avataaars', 'clothing', 'graphicShirt', 'avatar-drip'),
  ('bottts', 'top', 'glowingBulb01', 'avatar-glowbot'),
  ('bottts', 'top', 'glowingBulb02', 'avatar-glowbot'),
  ('bottts', 'top', 'lights', 'avatar-glowbot'),
  ('bottts', 'eyes', 'glow', 'avatar-glowbot'),
  ('bottts', 'eyes', 'eva', 'avatar-glowbot'),
  ('avataaars', 'accessories', 'eyepatch', 'avatar-villain'),
  ('bottts', 'top', 'horns', 'avatar-villain'),
  ('bottts', 'texture', 'camo01', 'avatar-villain'),
  ('bottts', 'texture', 'camo02', 'avatar-villain'),
  ('bigSmile', 'accessories', 'faceMask', 'avatar-villain'),
  ('bigSmile', 'accessories', 'clownNose', 'avatar-villain'),
  ('*', 'bg', 'sunset', 'avatar-gradients'),
  ('*', 'bg', 'ocean', 'avatar-gradients'),
  ('*', 'bg', 'aurora', 'avatar-gradients'),
  ('*', 'bg', 'candy', 'avatar-gradients'),
  ('*', 'bg', 'gold', 'avatar-gradients'),
  ('*', 'bg', 'galaxy', 'avatar-gradients')

on conflict (style, part, value) do update set cosmetic_id = excluded.cosmetic_id;

create or replace function public.set_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  path text;
  data jsonb;
  v_style text;
  item record;
  missing text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_avatar is null then
    update public.profiles set avatar = null where id = me;
    return;
  end if;

  if p_avatar like 'builtin:%' then
    if substr(p_avatar, 9) <> all (array['fox', 'cat', 'panda', 'owl', 'frog', 'bear', 'bunny', 'penguin']) then
      raise exception 'Unknown picture.';
    end if;
  elsif p_avatar like 'upload:%' then
    path := substr(p_avatar, 8);

    if split_part(path, '/', 1) <> me::text then
      raise exception 'That picture isn''t yours.';
    end if;

    if not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = path) then
      raise exception 'Upload the picture first.';
    end if;
  elsif p_avatar like 'db:%' then
    if char_length(p_avatar) > 800 then
      raise exception 'Unknown picture.';
    end if;

    begin
      data := substr(p_avatar, 4)::jsonb;
    exception when others then
      raise exception 'Unknown picture.';
    end;

    v_style := data ->> 's';

    if jsonb_typeof(data) <> 'object' or v_style is null
       or v_style <> all (array['avataaars', 'adventurer', 'bigSmile', 'bottts'])
       or jsonb_typeof(coalesce(data -> 'o', '{}'::jsonb)) <> 'object'
       or exists (select 1 from jsonb_object_keys(data) k where k not in ('s', 'o')) then
      raise exception 'Unknown picture.';
    end if;

    for item in select key, value from jsonb_each(coalesce(data -> 'o', '{}'::jsonb)) loop
      if item.key !~ '^[a-zA-Z]{1,24}$' or jsonb_typeof(item.value) <> 'string'
         or (item.value #>> '{}') !~ '^[a-zA-Z0-9]{0,24}$' then
        raise exception 'Unknown picture.';
      end if;
    end loop;

    select c.name into missing
    from jsonb_each_text(coalesce(data -> 'o', '{}'::jsonb)) o
    join public.avatar_premium ap
      on ap.part = o.key and ap.value = o.value and ap.style in (v_style, '*')
    join public.cosmetics c on c.id = ap.cosmetic_id
    where not exists (
      select 1 from public.user_cosmetics uc where uc.user_id = me and uc.cosmetic_id = ap.cosmetic_id
    )
    limit 1;

    if missing is not null then
      raise exception 'Get the % pack in the shop to use that.', missing;
    end if;
  else
    raise exception 'Unknown picture.';
  end if;

  update public.profiles set avatar = p_avatar where id = me;
end;
$$;
revoke all on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;

-- Emote messages ("::emote:<id>::"): free ones for all, the rest need the item.
create or replace function public.check_emote_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  emote text;
begin
  if new.body !~ '^::emote:' then
    return new;
  end if;

  emote := substring(new.body from '^::emote:([a-z]+)::$');

  if emote is null or emote not in ('wave', 'laugh', 'gg', 'dance', 'love', 'cry', 'rage', 'fire', 'crown') then
    raise exception 'Unknown emote.';
  end if;

  if emote not in ('wave', 'laugh', 'gg') and not exists (
    select 1 from public.user_cosmetics where user_id = new.sender_id and cosmetic_id = 'emote-' || emote
  ) then
    raise exception 'Get that emote in the shop first.';
  end if;

  return new;
end;
$$;
revoke all on function public.check_emote_message() from public, anon, authenticated;

drop trigger if exists lounge_emote_check on public.lounge_messages;
create trigger lounge_emote_check before insert on public.lounge_messages
  for each row execute function public.check_emote_message();

drop trigger if exists dm_emote_check on public.direct_messages;
create trigger dm_emote_check before insert on public.direct_messages
  for each row execute function public.check_emote_message();
