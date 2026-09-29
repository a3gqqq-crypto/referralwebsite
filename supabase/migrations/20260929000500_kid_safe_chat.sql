-- Kid-safe chat. Kids use Suffrova, so:
-- 1. Swearing, sexual talk, slurs and bullying are blocked (not starred out),
--    including spaced-out, stretched and leetspeak spellings.
-- 2. The Lounge needs Level 3 (200 XP) to chat; Lounge photos need Level 5.
--    Staff skip the level check.
-- 3. No phone numbers or email addresses in the Lounge.
-- 4. Bios go through the same filter.

create or replace function public.chat_safety_issue(p_text text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  base text;
  leet text;
  squashed text;
  w text;
  c text;
  sexual_words text[] := array[
    'sex', 'sexy', 'sext', 'sexting', 'nude', 'nudes', 'naked', 'horny', 'boob', 'boobs', 'boobies',
    'tit', 'tits', 'titty', 'titties', 'penis', 'dick', 'dicks', 'cock', 'cocks', 'pussy', 'pussies',
    'vagina', 'cum', 'cumming', 'anal', 'rape', 'raped', 'rapes', 'raping', 'rapist', 'pedo', 'pedos',
    'nsfw', 'xxx', 'milf', 'thot', 'thots', 'hoe', 'hoes', 'hooker', 'perv', 'pervert', 'boner',
    'erection', 'orgy', 'kinky', 'incest', 'stripper', 'onlyfans'
  ];
  language_words text[] := array[
    'shit', 'shits', 'shitty', 'shitting', 'bullshit', 'ass', 'asses', 'asshole', 'assholes', 'arse',
    'arsehole', 'dumbass', 'jackass', 'smartass', 'fatass', 'badass', 'asswipe', 'bastard', 'bastards',
    'damn', 'dammit', 'goddamn', 'piss', 'pissed', 'prick', 'twat', 'wanker', 'bollocks', 'fk', 'fck',
    'fcking', 'fuk', 'fuking', 'fking', 'fkn', 'fuq', 'wtf', 'stfu', 'gtfo', 'lmfao', 'ffs', 'mf', 'mfs',
    'slut', 'sluts', 'whore', 'whores', 'bitch', 'bitches'
  ];
  hate_words text[] := array[
    'fag', 'fags', 'faggot', 'faggots', 'retard', 'retards', 'retarded', 'tranny', 'chink', 'spic',
    'kike', 'dyke', 'paki', 'gook', 'wetback', 'coon', 'homo'
  ];
  bullying_words text[] := array['kys', 'unalive'];
begin
  -- Lowercase, drop accents, undo leetspeak.
  base := regexp_replace(normalize(lower(coalesce(p_text, '')), NFKD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g');
  leet := translate(base, '0134578@$!|', 'oieastbasil');
  squashed := regexp_replace(leet, '[^a-z]', '', 'g');

  -- Anywhere in the message, even s p a c e d  o u t or stretttched.
  if squashed ~ '(c+h+i+l+d+p+o+r+n|c+h+i+l+d+s+e+x|k+i+d+s+e+x|m+i+n+o+r+s+e+x|p+e+d+o+p+h+i+l|l+o+l+i+c+o+n|s+h+o+t+a+c+o+n|p+o+r+n|h+e+n+t+a+i|b+l+o+w+j+o+b|h+a+n+d+j+o+b|o+n+l+y+f+a+n+s|m+a+s+t+u+r+b+a+t|n+u+d+e+s|d+i+l+d+o|o+r+g+a+s+m)' then
    return 'sexual';
  end if;

  if squashed ~ '(n+i+g+g+(e+r|a|a+h|u+h)|f+a+g+g+o+t|t+r+a+n+n+y)' then
    return 'hate';
  end if;

  -- ("bitch" and "motherf..." are checked word by word below: "a bit chilly"
  -- and "mother figure" would match here.)
  if squashed ~ '(f+u+c+k|c+u+n+t)' then
    return 'language';
  end if;

  if squashed ~ '(k+i+l+l+(y+o+u+r|u+r|y+o)+s+e+l+f|n+e+c+k+y+o+u+r+s+e+l+f|h+a+n+g+y+o+u+r+s+e+l+f|u+n+a+l+i+v+e+y+o+u+r+s+e+l+f|g+o+d+i+e+i+n+a+h+o+l+e)' then
    return 'bullying';
  end if;

  -- Word by word (so "class", "grape" and "Sussex" are fine). Runs of single
  -- letters ("s e x") are joined back into a word too.
  foreach w in array regexp_split_to_array(regexp_replace(leet, '[^a-z]+', ' ', 'g'), ' ')
      || array(select replace(m[1], ' ', '') from regexp_matches(regexp_replace(leet, '[^a-z]+', ' ', 'g'), '((?:\m[a-z] )+[a-z]\M)', 'g') as m) loop
    continue when w = '';
    c := regexp_replace(w, '(.)\1+', '\1', 'g');

    if w = any(sexual_words) or c = any(sexual_words) or w ~ '^(porn|molest|rapist|pedoph|masturbat)' then
      return 'sexual';
    end if;
    if w = any(hate_words) or c = any(hate_words) or w ~ '^(fagg|retard|nigg)' then
      return 'hate';
    end if;
    if w = any(bullying_words) or c = any(bullying_words) then
      return 'bullying';
    end if;
    if w = any(language_words) or c = any(language_words) or w ~ '^(fuck|shit|bitch|slut|whore|motherf)' then
      return 'language';
    end if;
  end loop;

  if leet ~ '\m(go die|kill urself|kill yourself|nobody likes you|you should die)\M' then
    return 'bullying';
  end if;

  return null;
end;
$$;
revoke all on function public.chat_safety_issue(text) from public, anon, authenticated;

-- Friendly message for each kind of problem.
create or replace function public.assert_kid_safe(p_text text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  issue text := public.chat_safety_issue(p_text);
begin
  if issue = 'language' then
    raise exception 'Keep it clean, no swearing. Kids use Suffrova too.';
  elsif issue = 'bullying' then
    raise exception 'Be kind. That''s not okay to say here.';
  elsif issue is not null then
    raise exception 'That isn''t allowed on Suffrova.';
  end if;
end;
$$;
revoke all on function public.assert_kid_safe(text) from public, anon, authenticated;

-- Used by the Lounge and DMs: blocks bad messages instead of starring words.
create or replace function public.chat_clean(p_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  body text := btrim(coalesce(p_body, ''));
begin
  if body = '' then
    raise exception 'Message is empty.';
  end if;

  perform public.assert_kid_safe(body);
  return body;
end;
$$;
revoke all on function public.chat_clean(text) from public, anon, authenticated;

create or replace function public.send_lounge_message(p_body text, p_image text default null, p_reply_to bigint default null)
returns public.lounge_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  msg text := btrim(coalesce(p_body, ''));
  clean text := '';
  inserted public.lounge_messages;
  my_xp integer;
  staff boolean;
begin
  perform public.assert_can_chat(me);

  select xp into my_xp from public.profiles where id = me;
  staff := exists (select 1 from public.admins where user_id = me);

  if not staff and coalesce(my_xp, 0) < 200 then
    raise exception 'Reach Level 3 to chat in the Lounge. Check in daily and do quests to level up.';
  end if;

  if msg = '' and p_image is null then
    raise exception 'Message is empty.';
  end if;

  if char_length(msg) > 500 then
    raise exception 'Keep it under 500 characters.';
  end if;

  if msg ~* '(https?://|www\.|discord\.gg|\m[a-z0-9-]+\.(com|net|org|gg|io|me|xyz|ly|co|app|link)\M)' then
    raise exception 'Links aren''t allowed in the lounge.';
  end if;

  -- Keep personal info out of a public room.
  if msg ~ '(\d[\s\-\.\(\)]*){9,}' then
    raise exception 'Don''t share phone numbers in the Lounge. Stay safe!';
  end if;

  if msg ~* '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}' then
    raise exception 'Don''t share email addresses in the Lounge. Stay safe!';
  end if;

  if exists (select 1 from public.lounge_messages
             where sender_id = me and created_at > now() - interval '2 seconds')
     or (select count(*) from public.lounge_messages
         where sender_id = me and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Slow down a little.';
  end if;

  if p_image is not null then
    if not staff and coalesce(my_xp, 0) < 800 then
      raise exception 'Reach Level 5 to post photos in the lounge.';
    end if;

    if (select count(*) from public.lounge_messages
        where sender_id = me and image is not null and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'That''s a lot of photos. Try again in a few minutes.';
    end if;

    perform public.chat_image_ok(me, p_image);
  end if;

  if msg <> '' then
    clean := public.chat_clean(msg);

    if p_image is null and exists (
      select 1 from public.lounge_messages
      where sender_id = me and body = clean and created_at > now() - interval '1 minute'
    ) then
      raise exception 'You just sent that.';
    end if;
  end if;

  if p_reply_to is not null and not exists (
    select 1 from public.lounge_messages where id = p_reply_to and not deleted
  ) then
    raise exception 'That message is gone.';
  end if;

  insert into public.lounge_messages (sender_id, body, image, reply_to) values (me, clean, p_image, p_reply_to)
  returning * into inserted;

  return inserted;
end;
$$;
revoke all on function public.send_lounge_message(text, text, bigint) from public, anon;
grant execute on function public.send_lounge_message(text, text, bigint) to authenticated;

create or replace function public.update_profile_bio(p_bio text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := nullif(btrim(p_bio), '');
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  if clean is not null and char_length(clean) > 160 then
    raise exception 'Bio must be 160 characters or less';
  end if;

  if clean is not null then
    perform public.assert_kid_safe(clean);
  end if;

  update public.profiles set bio = clean where id = me;
end;
$$;
revoke all on function public.update_profile_bio(text) from public, anon;
grant execute on function public.update_profile_bio(text) to authenticated;
