-- Full-body (Bitmoji-style) avatars: style "fb" in the avatar maker.
-- Packs are reworked for it, plus two new ones (Pose pack, Royal).

update public.cosmetics set name = 'Winter fits' where id = 'avatar-winter';
update public.cosmetics set name = 'Drip' where id = 'avatar-drip';
update public.cosmetics set name = 'Gamer' where id = 'avatar-glowbot';

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('avatar-poses', 'avatar', 'Poses',     'rare',       99, null),
  ('avatar-royal', 'avatar', 'Royal',     'legendary', 399, null)
on conflict (id) do nothing;

insert into public.avatar_premium (style, part, value, cosmetic_id) values
  ('fb', 'glasses', 'sunglasses', 'avatar-shades'),
  ('fb', 'glasses', 'aviators', 'avatar-shades'),
  ('fb', 'glasses', 'heart', 'avatar-shades'),
  ('fb', 'hat', 'beanie', 'avatar-winter'),
  ('fb', 'top', 'puffer', 'avatar-winter'),
  ('fb', 'shoes', 'boots', 'avatar-winter'),
  ('fb', 'earrings', 'hoops', 'avatar-bling'),
  ('fb', 'necklace', 'chain', 'avatar-bling'),
  ('fb', 'top', 'bomber', 'avatar-drip'),
  ('fb', 'top', 'leather', 'avatar-drip'),
  ('fb', 'bottom', 'cargo', 'avatar-drip'),
  ('fb', 'shoes', 'hightops', 'avatar-drip'),
  ('fb', 'hat', 'catears', 'avatar-kawaii'),
  ('fb', 'eyes', 'star', 'avatar-kawaii'),
  ('fb', 'eyes', 'hearts', 'avatar-kawaii'),
  ('fb', 'hat', 'headphones', 'avatar-glowbot'),
  ('fb', 'top', 'jersey', 'avatar-glowbot'),
  ('fb', 'hat', 'horns', 'avatar-villain'),
  ('fb', 'glasses', 'eyepatch', 'avatar-villain'),
  ('fb', 'hat', 'crown', 'avatar-royal'),
  ('fb', 'hat', 'halo', 'avatar-royal'),
  ('fb', 'top', 'suit', 'avatar-royal'),
  ('fb', 'pose', 'peace', 'avatar-poses'),
  ('fb', 'pose', 'flex', 'avatar-poses')
on conflict (style, part, value) do update set cosmetic_id = excluded.cosmetic_id;

-- set_avatar: allow the fb style (otherwise unchanged).
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
       or v_style <> all (array['avataaars', 'adventurer', 'bigSmile', 'bottts', 'fb'])
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
