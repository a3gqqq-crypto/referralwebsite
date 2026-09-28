-- Six more emotes, and the emote check reads the shop table instead of a
-- hardcoded list (new emotes only need a cosmetics row).

insert into public.cosmetics (id, type, name, rarity, price_cents, earn_rule) values
  ('emote-shock',  'emote', 'Shook',    'rare', 249, null),
  ('emote-sleepy', 'emote', 'Sleepy',   'rare', 249, null),
  ('emote-clap',   'emote', 'Clap',     'rare', 249, null),
  ('emote-cool',   'emote', 'Too cool', 'epic', 349, null),
  ('emote-money',  'emote', 'Rich',     'epic', 349, null),
  ('emote-skull',  'emote', 'Dead',     'epic', 349, null)
on conflict (id) do nothing;

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
