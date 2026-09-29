// Verified membership: $7 per 30 days. Like Discord Nitro, the badge evolves
// with real time subscribed (not months bought at once): verified_since is
// when the current unbroken subscription started.
import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "../lib/supabaseClient";

export const VERIFIED_ITEM_ID = "verified-month";

const DAY = 86400000;
const MONTH_DAYS = 30;

// shape: how the badge looks (see VerifiedTick).
export const VERIFIED_TIERS = [
  { id: "bronze", name: "Bronze", months: 1, shape: "seal8", colors: ["#e6a06a", "#a15a24"] },
  { id: "silver", name: "Silver", months: 3, shape: "seal10", colors: ["#f2f4f8", "#9aa3b0"] },
  { id: "gold", name: "Gold", months: 6, shape: "seal12", colors: ["#ffe27a", "#e39b00"] },
  { id: "platinum", name: "Platinum", months: 12, shape: "crest", colors: ["#e8fbff", "#7fb9c9"] },
  { id: "diamond", name: "Diamond", months: 24, shape: "diamond", colors: ["#a8e4ff", "#4f7cff"] },
  { id: "emerald", name: "Emerald", months: 36, shape: "emerald", colors: ["#7cf0b4", "#0f8a5a"] },
  { id: "ruby", name: "Ruby", months: 60, shape: "ruby", colors: ["#ff7a8e", "#b3122e"] },
  { id: "opal", name: "Opal", months: 72, shape: "opal", colors: ["#ffd6f5", "#8fd8ff"] },
];

export const isVerified = (player) =>
  Boolean(player?.verified_until) && new Date(player.verified_until) > new Date();

// Full months subscribed so far in the current run (0 in the first month).
export function verifiedMonths(player) {
  if (!isVerified(player)) return 0;
  const since = player.verified_since ? new Date(player.verified_since) : new Date();
  return Math.floor(Math.max(0, Date.now() - since) / (MONTH_DAYS * DAY));
}

// The badge someone shows right now (null if not verified). Bronze from day
// one, then each tier once that many full months have passed.
export function verifiedTier(player) {
  if (!isVerified(player)) return null;
  const months = verifiedMonths(player);
  return [...VERIFIED_TIERS].reverse().find((tier) => months >= tier.months) || VERIFIED_TIERS[0];
}

export const nextVerifiedTier = (tier) => {
  const index = VERIFIED_TIERS.findIndex((item) => item.id === tier?.id);
  return VERIFIED_TIERS[index + 1] || null;
};

// Days until the badge evolves to `next`.
export function daysUntilTier(player, next) {
  if (!next || !player?.verified_since) return null;
  const at = new Date(player.verified_since).getTime() + next.months * MONTH_DAYS * DAY;
  return Math.max(0, Math.ceil((at - Date.now()) / DAY));
}

/* ---------- Who is verified (shared, like the staff list) ---------- */

// Lists like leaderboards come from queries that don't include membership
// info, so badges look people up here by id. Loaded once, refreshed every
// few minutes, and right after someone buys.
let verified = new Map();
let pending = null;
let loadedAt = 0;
const listeners = new Set();

export function loadVerified({ force = false } = {}) {
  if (pending) return pending;
  if (!force && Date.now() - loadedAt < 5 * 60 * 1000) return Promise.resolve(verified);

  pending = supabase
    .from("profiles")
    .select("id, verified_until, verified_since")
    .gt("verified_until", new Date().toISOString())
    .then(({ data, error }) => {
      pending = null;
      if (error) {
        console.error("Could not load verified members:", error);
        return verified;
      }
      loadedAt = Date.now();
      verified = new Map((data || []).map((row) => [row.id, row]));
      listeners.forEach((listener) => listener());
      return verified;
    });

  return pending;
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useVerifiedMembers() {
  const current = useSyncExternalStore(subscribe, () => verified);

  useEffect(() => {
    loadVerified();
  }, []);

  return current;
}

export function verifiedDaysLeft(player) {
  if (!isVerified(player)) return 0;
  return Math.ceil((new Date(player.verified_until) - new Date()) / DAY);
}
