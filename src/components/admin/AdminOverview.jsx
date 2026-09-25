import { useEffect, useState } from "react";

import SkeletonRows from "../SkeletonRows";
import { adminCall } from "./adminApi";

const STATS = [
  { key: "users", label: "Members" },
  { key: "new_24h", label: "Joined today" },
  { key: "new_7d", label: "Joined this week" },
  { key: "referrals_24h", label: "Referrals today" },
  { key: "referrals_7d", label: "Referrals this week" },
  { key: "lounge_24h", label: "Lounge messages today" },
  { key: "dms_24h", label: "DMs today" },
  { key: "open_reports", label: "Open reports", alert: true },
  { key: "chat_banned", label: "Chat banned" },
];

function AdminOverview({ onOpenReports }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    adminCall("admin_overview").then((result) => {
      if (cancelled) return;

      if (result.ok) setStats(result.data);
      else setError(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!stats) return <SkeletonRows count={3} />;

  return (
    <div className="admin-stats">
      {STATS.map((stat) => {
        const value = stats[stat.key] ?? 0;
        const flagged = stat.alert && value > 0;

        return (
          <div key={stat.key} className={`admin-stat card ${flagged ? "is-alert" : ""}`}>
            <span className="admin-stat-label">{stat.label}</span>
            <strong className="mono">{value}</strong>

            {flagged && (
              <button type="button" className="btn btn-sm" onClick={onOpenReports}>
                Review
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AdminOverview;
