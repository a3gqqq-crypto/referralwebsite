import { supabase } from "../../lib/supabaseClient";

// Every admin RPC checks admin status on the server; this only normalizes results.
export async function adminCall(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);

  if (error) {
    console.error(`${fn} failed:`, error);
    return { ok: false, error: error.message || "Something went wrong." };
  }

  return { ok: true, data };
}

export function timeAgo(date) {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
