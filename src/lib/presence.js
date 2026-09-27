import { useSyncExternalStore } from "react";

import { supabase } from "./supabaseClient";

// Who's online right now, via Supabase Realtime Presence: each signed-in tab
// joins one shared channel keyed by user id, so everyone sees the same set
// update live. Nothing is stored in the database for this.

let online = new Set();
let inCalls = {}; // room key -> number of people in it
let channel = null;
let currentCall = null;
let since = null;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export function startPresence(userId) {
  if (!userId || channel) return;

  channel = supabase.channel("online-users", { config: { presence: { key: userId } } });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel?.presenceState() || {};
      online = new Set(Object.keys(state));

      const counts = {};
      Object.values(state).forEach((metas) => {
        const room = metas.find((meta) => meta.call)?.call;
        if (room) counts[room] = (counts[room] || 0) + 1;
      });
      inCalls = counts;

      emit();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        since = since || new Date().toISOString();
        channel?.track({ since, call: currentCall });
      }
    });
}

// Tell everyone which call you're in (null when you leave).
export function setPresenceCall(roomKey) {
  currentCall = roomKey;
  channel?.track({ since: since || new Date().toISOString(), call: roomKey });
}

export function stopPresence() {
  if (!channel) return;

  supabase.removeChannel(channel);
  channel = null;
  online = new Set();
  inCalls = {};
  emit();
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useOnlineUsers() {
  return useSyncExternalStore(subscribe, () => online);
}

export function useInCallCount(roomKey) {
  return useSyncExternalStore(subscribe, () => inCalls[roomKey] || 0);
}

export function useIsOnline(userId) {
  return useOnlineUsers().has(userId);
}

// "Last seen" wording for someone who's offline.
export function lastSeenText(date) {
  if (!date) return "Offline";

  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));

  if (minutes < 60) return `Last seen ${minutes}m ago`;
  if (minutes < 60 * 24) return `Last seen ${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 30) return `Last seen ${Math.round(minutes / 1440)}d ago`;
  return "Last seen a while ago";
}
