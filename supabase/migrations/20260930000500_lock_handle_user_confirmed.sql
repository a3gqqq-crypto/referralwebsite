-- Trigger-only function; not callable from the API.
revoke all on function public.handle_user_confirmed() from public, anon, authenticated;
