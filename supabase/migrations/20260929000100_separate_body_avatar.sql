-- The 3D full-body avatar gets its own column, separate from the profile
-- picture. profiles.avatar = profile picture (photo, classic, or avatar head);
-- profiles.body_avatar = full-body avatar (profile banner, calls, emotes).

alter table public.profiles add column if not exists body_avatar text
  check (body_avatar is null or (body_avatar like 'db:{%}' and char_length(body_avatar) <= 800));

grant select (body_avatar) on public.profiles to anon, authenticated;

-- People who already built one keep it as their avatar; their picture stays too.
update public.profiles set body_avatar = avatar
where body_avatar is null and avatar like 'db:{"s":"fb"%';

-- Shared checks for avatar-maker strings. Returns the style.
create or replace function public.check_db_avatar(p_user uuid, p_avatar text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  data jsonb;
  v_style text;
  item record;
  missing text;
begin
  if p_avatar is null or p_avatar not like 'db:%' or char_length(p_avatar) > 800 then
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
    select 1 from public.user_cosmetics uc where uc.user_id = p_user and uc.cosmetic_id = ap.cosmetic_id
  )
  limit 1;

  if missing is not null then
    raise exception 'Get the % pack in the shop to use that.', missing;
  end if;

  return v_style;
end;
$$;
revoke all on function public.check_db_avatar(uuid, text) from public, anon, authenticated;

create or replace function public.set_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  path text;
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
    perform public.check_db_avatar(me, p_avatar);
  else
    raise exception 'Unknown picture.';
  end if;

  update public.profiles set avatar = p_avatar where id = me;
end;
$$;
revoke all on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;

create or replace function public.set_body_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if p_avatar is not null and public.check_db_avatar(me, p_avatar) <> 'fb' then
    raise exception 'Unknown avatar.';
  end if;

  update public.profiles set body_avatar = p_avatar where id = me;
end;
$$;
revoke all on function public.set_body_avatar(text) from public, anon;
grant execute on function public.set_body_avatar(text) to authenticated;
