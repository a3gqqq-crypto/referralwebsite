-- push_new_notification() only runs as a trigger; nobody should call it
-- directly through the API.
revoke all on function public.push_new_notification() from public, anon, authenticated;
