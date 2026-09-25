import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "../lib/supabaseClient";

// Events are managed from the admin panel and live in the `events` table.
// Rows are mapped to the shape the pages already use (startDate/endDate/rules).
export const EVENT_COLUMNS =
  "id, title, subtitle, description, prize, starts_at, ends_at, image, type, active, winners";

export function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || "",
    description: row.description,
    prize: row.prize,
    startDate: row.starts_at,
    endDate: row.ends_at,
    image: row.image,
    type: row.type,
    active: row.active,
    rules: {
      ranking: "referrals_during_event",
      winners: Array.isArray(row.winners) ? row.winners : [],
    },
  };
}

let state = { events: [], loading: true, error: "" };
let pending = null;
let loaded = false;
const listeners = new Set();

const setState = (next) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export function loadEvents({ force = false } = {}) {
  if (pending) return pending;
  if (loaded && !force) return Promise.resolve(state.events);

  pending = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("active", true)
    .order("starts_at", { ascending: false })
    .then(({ data, error }) => {
      pending = null;

      if (error) {
        console.error("Could not load events:", error);
        setState({ loading: false, error: "Could not load events." });
        return state.events;
      }

      loaded = true;
      setState({ events: (data || []).map(toEvent), loading: false, error: "" });
      return state.events;
    });

  return pending;
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = () => state;

export function useEventList() {
  const current = useSyncExternalStore(subscribe, snapshot);

  useEffect(() => {
    loadEvents();
  }, []);

  return current;
}

// The event the nav "Leaderboard" link should open: live, else next up, else most recent.
export function featuredEvent(events, now = new Date()) {
  const active = events.filter((event) => event.active);
  const start = (event) => new Date(event.startDate);
  const end = (event) => new Date(event.endDate);

  const live = active.find((event) => start(event) <= now && now <= end(event));
  if (live) return live;

  const upcoming = active
    .filter((event) => start(event) > now)
    .sort((a, b) => start(a) - start(b))[0];
  if (upcoming) return upcoming;

  return [...active].sort((a, b) => end(b) - end(a))[0] || null;
}
