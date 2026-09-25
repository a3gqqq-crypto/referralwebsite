-- Trigger and maintenance functions shouldn't be callable over the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.delete_expired_moments() from public, anon, authenticated;

alter function public.set_moment_expiry() set search_path = '';
