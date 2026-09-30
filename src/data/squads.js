import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "../lib/supabaseClient";

// Squads: teams that battle in weekly Squad Wars. Must match the database's
// allowed emblems and colours (create_squad / update_squad).
export const SQUAD_EMBLEMS = ["⚡", "🔥", "👑", "🐺", "🦁", "🐉", "🚀", "💎", "🌙", "🌸", "🎮", "⚽", "🦅", "👻", "🍀", "🎯"];

export const SQUAD_COLORS = {
  sunset: { label: "Sunset", from: "#ff4d8d", to: "#ff9f3d" },
  ocean: { label: "Ocean", from: "#2f80ed", to: "#56ccf2" },
  forest: { label: "Forest", from: "#11998e", to: "#38ef7d" },
  grape: { label: "Grape", from: "#7b2ff7", to: "#c471f5" },
  gold: { label: "Gold", from: "#f2994a", to: "#f2c94c" },
  night: { label: "Night", from: "#243b55", to: "#5b6c8f" },
};

export const squadGradient = (color) => {
  const c = SQUAD_COLORS[color] || SQUAD_COLORS.sunset;
  return `linear-gradient(135deg, ${c.from}, ${c.to})`;
};

export const MAX_SQUAD = 30;

// Week runs Monday 00:00 UTC to the next Monday.
export function weekEnds(now = new Date()) {
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day);
  return new Date(start + 7 * 86400000);
}

export function formatLeft(until, now = Date.now()) {
  const ms = Math.max(0, until - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/* ---------- Who is in which squad (shared store, like Verified) ---------- */

let bySquad = new Map(); // squad id -> squad
let byUser = new Map(); // user id -> squad
let pending = null;
let loadedAt = 0;
let snapshot = { bySquad, byUser };
const listeners = new Set();

export function loadSquads({ force = false } = {}) {
  if (pending) return pending;
  if (!force && Date.now() - loadedAt < 3 * 60 * 1000) return Promise.resolve(snapshot);

  pending = Promise.all([
    supabase.from("squads").select("id, name, tag, emblem, color, description, owner_id, created_at"),
    supabase.from("squad_members").select("user_id, squad_id, joined_at"),
  ]).then(([squadResult, memberResult]) => {
    pending = null;
    if (squadResult.error || memberResult.error) {
      console.error("Could not load squads:", squadResult.error || memberResult.error);
      return snapshot;
    }
    loadedAt = Date.now();
    bySquad = new Map((squadResult.data || []).map((squad) => [squad.id, { ...squad, memberIds: [] }]));
    byUser = new Map();
    (memberResult.data || []).forEach((row) => {
      const squad = bySquad.get(row.squad_id);
      if (!squad) return;
      squad.memberIds.push(row.user_id);
      byUser.set(row.user_id, squad);
    });
    snapshot = { bySquad, byUser };
    listeners.forEach((listener) => listener());
    return snapshot;
  });

  return pending;
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSquads() {
  const current = useSyncExternalStore(subscribe, () => snapshot);

  useEffect(() => {
    loadSquads();
  }, []);

  return current;
}

export const useSquadOf = (userId) => {
  const { byUser: users } = useSquads();
  return userId ? users.get(userId) || null : null;
};

export const squadByTag = (squads, tag) =>
  [...squads.bySquad.values()].find((squad) => squad.tag === String(tag || "").toUpperCase()) || null;
