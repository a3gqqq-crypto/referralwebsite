-- Only owners can give items (gifts, podium rewards, the owner's free shop).
-- Admins keep moderation powers but can't hand out free stuff.

create or replace function public.admin_grant_cosmetic(p_user uuid, p_cosmetic text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_name text;
begin
  perform public.owner_guard('grant_cosmetic', p_user::text, json_build_object('cosmetic', p_cosmetic)::jsonb);

  select name into item_name from public.cosmetics where id = p_cosmetic;

  if item_name is null then
    raise exception 'Unknown item.';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, source)
  values (p_user, p_cosmetic, 'gift')
  on conflict do nothing;

  -- No gift notification when owners unlock things for themselves.
  if found and p_user <> auth.uid() then
    perform public.notify(p_user, 'gift', 'You got ' || item_name || ' 🎁', 'A gift from the Suffrova team. Equip it on your profile.', '/profile');
  end if;
end;
$$;

revoke all on function public.admin_grant_cosmetic(uuid, text) from public, anon;
grant execute on function public.admin_grant_cosmetic(uuid, text) to authenticated;
