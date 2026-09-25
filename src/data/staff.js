import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "../lib/supabaseClient";

// Who is staff (owner/admin), loaded once and shared, for the tags next to names.
let staff = new Map();
let pending = null;
let loaded = false;
const listeners = new Set();

export function loadStaff({ force = false } = {}) {
  if (pending) return pending;
  if (loaded && !force) return Promise.resolve(staff);

  pending = supabase.rpc("staff_list").then(({ data, error }) => {
    pending = null;

    if (error) {
      console.error("Could not load staff:", error);
      return staff;
    }

    loaded = true;
    staff = new Map((data || []).map((row) => [row.user_id, row.role]));
    listeners.forEach((listener) => listener());
    return staff;
  });

  return pending;
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useStaff() {
  const current = useSyncExternalStore(subscribe, () => staff);

  useEffect(() => {
    loadStaff();
  }, []);

  return current;
}

export const STAFF_LABEL = { owner: "Owner", admin: "Admin" };
