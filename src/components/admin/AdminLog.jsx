import { useEffect, useState } from "react";

import SkeletonRows from "../SkeletonRows";
import { cosmeticById } from "../../data/cosmetics";
import { adminCall, formatDateTime } from "./adminApi";

const ACTION_LABEL = {
  resolve_report: "Updated report",
  chat_ban: "Banned from chat",
  chat_unban: "Unbanned from chat",
  clear_avatar: "Removed picture",
  set_role: "Changed staff role",
  delete_lounge_message: "Removed lounge message",
  grant_cosmetic: "Gave item",
  save_event: "Saved event",
  mark_paid: "Marked prize paid",
  mark_unpaid: "Marked prize unpaid",
};

function describe(entry) {
  const details = entry.details || {};
  const who = entry.target_user || "unknown member";

  if (entry.action === "grant_cosmetic") {
    return `${cosmeticById(details.cosmetic)?.name || details.cosmetic} → ${who}`;
  }
  if (entry.action === "resolve_report") return `report #${entry.target} → ${details.status}`;
  if (entry.action === "save_event") return details.title || entry.target;
  if (entry.action.startsWith("mark_")) {
    return `${who} · #${details.place} ${details.reward || ""} · ${entry.target}`;
  }
  if (entry.action.startsWith("chat_") || entry.action === "clear_avatar") return who;
  if (entry.action === "set_role") return `${who} → ${details.role || "no role"}`;

  return entry.target;
}

function AdminLog() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    adminCall("admin_log_list", { p_limit: 200 }).then((result) => {
      if (cancelled) return;

      if (result.ok) setEntries(result.data || []);
      else setError(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!entries) return <SkeletonRows count={4} />;
  if (!entries.length) return <p className="admin-empty">Nothing yet. Every admin action shows up here.</p>;

  return (
    <ol className="admin-log card">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="admin-meta mono">{formatDateTime(entry.created_at)}</span>
          <strong>{entry.admin}</strong>
          <span>{ACTION_LABEL[entry.action] || entry.action}</span>
          <span className="admin-meta admin-log-target">{describe(entry)}</span>
        </li>
      ))}
    </ol>
  );
}

export default AdminLog;
