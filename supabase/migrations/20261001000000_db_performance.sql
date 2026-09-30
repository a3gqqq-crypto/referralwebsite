-- Speed-ups flagged by the Supabase performance advisor. No behaviour changes.

-- 1) Row-level rules: work out the signed-in user once per query instead of per row.
alter policy "see own blocks" on public.blocks using (blocker_id = (select auth.uid()));
alter policy "users read own crypto orders" on public.crypto_orders using (user_id = (select auth.uid()));
alter policy "participants read dms" on public.direct_messages
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
alter policy "Users can leave events" on public.event_participants using ((select auth.uid()) = user_id);
alter policy "Users can join events" on public.event_participants
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.events e where e.id = event_participants.event_id and e.active and e.ends_at > now())
  );
alter policy "Users can view their own event participation" on public.event_participants using ((select auth.uid()) = user_id);
alter policy "see own friendships" on public.friendships
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);
alter policy "Users can create their own moments" on public.moments with check (creator_id = (select auth.uid()));
alter policy "Creators read their own moments" on public.moments using (creator_id = (select auth.uid()));
alter policy "Users can delete their own moments" on public.moments using (creator_id = (select auth.uid()));
alter policy "users read own notifications" on public.notifications using (user_id = (select auth.uid()));
alter policy "users read own purchases" on public.purchases using (user_id = (select auth.uid()));
alter policy "users read own inventory" on public.user_cosmetics using (user_id = (select auth.uid()));
alter policy "users read own xp history" on public.xp_events using (user_id = (select auth.uid()));

-- 2) Indexes for foreign keys that are looked up or joined on.
create index if not exists admin_log_admin_id_idx on public.admin_log (admin_id);
create index if not exists announcements_created_by_idx on public.announcements (created_by);
create index if not exists avatar_premium_cosmetic_id_idx on public.avatar_premium (cosmetic_id);
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists call_debug_user_id_idx on public.call_debug (user_id);
create index if not exists call_members_invited_by_idx on public.call_members (invited_by);
create index if not exists calls_host_id_idx on public.calls (host_id);
create index if not exists chat_groups_owner_id_idx on public.chat_groups (owner_id);
create index if not exists crypto_orders_cosmetic_id_idx on public.crypto_orders (cosmetic_id);
create index if not exists direct_messages_reply_to_idx on public.direct_messages (reply_to);
create index if not exists event_participants_user_id_idx on public.event_participants (user_id);
create index if not exists event_payouts_user_id_idx on public.event_payouts (user_id);
create index if not exists friendships_requested_by_idx on public.friendships (requested_by);
create index if not exists friendships_user_b_idx on public.friendships (user_b);
create index if not exists group_messages_reply_to_idx on public.group_messages (reply_to);
create index if not exists lounge_messages_reply_to_idx on public.lounge_messages (reply_to);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists purchases_cosmetic_id_idx on public.purchases (cosmetic_id);
create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists referrals_inviter_id_idx on public.referrals (inviter_id, created_at);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id, created_at);
create index if not exists sticker_premium_cosmetic_id_idx on public.sticker_premium (cosmetic_id);
create index if not exists user_cosmetics_cosmetic_id_idx on public.user_cosmetics (cosmetic_id);

-- 3) Same index twice on referrals; the unique constraint's index stays.
drop index if exists public.referrals_invited_user_unique_idx;
