import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import SkeletonRows from "../SkeletonRows";
import { useChatImage } from "../../lib/chatImages";
import { adminCall, timeAgo } from "./adminApi";

const KIND_LABEL = {
  profile: "Profile",
  lounge: "Lounge message",
  dm: "Direct message",
};

function ReportPhoto({ path }) {
  const link = useChatImage(path);

  if (!link?.url) {
    return <p className="admin-meta">{link?.failed ? "Photo was deleted." : "Loading photo…"}</p>;
  }

  return (
    <a href={link.url} target="_blank" rel="noreferrer" className="admin-report-photo">
      <img src={link.url} alt="Reported" />
    </a>
  );
}

function AdminReports({ onChange }) {
  const [filter, setFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const result = await adminCall("admin_reports", { p_status: filter });

    if (result.ok) {
      setReports(result.data || []);
      setError("");
    } else {
      setError(result.error);
    }
  }, [filter]);

  useEffect(() => {
    setReports(null);
    load();
  }, [load]);

  const act = async (id, fn, args) => {
    setBusy(id);
    const result = await adminCall(fn, args);
    setBusy(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await load();
    onChange?.();
  };

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="admin-segment" role="group" aria-label="Filter reports">
          {["open", "reviewed", "dismissed", "all"].map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "active" : ""}
              onClick={() => setFilter(key)}
            >
              {key[0].toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      {!reports ? (
        <SkeletonRows count={3} />
      ) : reports.length === 0 ? (
        <p className="admin-empty">
          {filter === "open" ? "No open reports. All clear." : "Nothing here."}
        </p>
      ) : (
        <ul className="admin-list">
          {reports.map((report) => (
            <li key={report.id} className="admin-report card">
              <div className="admin-report-head">
                <span className="chip">{KIND_LABEL[report.kind] || report.kind}</span>
                {report.status !== "open" && (
                  <span className="chip chip-ended">{report.status}</span>
                )}
                <span className="admin-meta">{timeAgo(report.created_at)}</span>
              </div>

              <p className="admin-report-who">
                <Link to={`/u/${encodeURIComponent(report.reporter)}`}>{report.reporter}</Link>
                {" reported "}
                <Link to={`/u/${encodeURIComponent(report.reported)}`}>{report.reported}</Link>
                {report.reported_banned && <span className="chip admin-banned">Chat banned</span>}
              </p>

              {report.reason && <p className="admin-report-reason">“{report.reason}”</p>}

              {report.message_image && <ReportPhoto path={report.message_image} />}

              {report.message_body != null && report.message_body !== "" && (
                <blockquote className={`admin-report-message ${report.message_deleted ? "is-deleted" : ""}`}>
                  {report.message_body}
                  {report.message_deleted && <small> · removed</small>}
                </blockquote>
              )}

              <div className="admin-actions">
                {report.kind === "lounge" && report.message_id && !report.message_deleted && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy === report.id}
                    onClick={() =>
                      act(report.id, "admin_delete_lounge_message", { p_id: report.message_id })
                    }
                  >
                    Remove message
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy === report.id}
                  onClick={() =>
                    act(report.id, "admin_set_chat_ban", {
                      p_user: report.reported_id,
                      p_banned: !report.reported_banned,
                    })
                  }
                >
                  {report.reported_banned ? "Unban from chat" : "Ban from chat"}
                </button>

                {report.status === "open" ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={busy === report.id}
                      onClick={() =>
                        act(report.id, "admin_resolve_report", { p_id: report.id, p_status: "reviewed" })
                      }
                    >
                      Mark handled
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={busy === report.id}
                      onClick={() =>
                        act(report.id, "admin_resolve_report", { p_id: report.id, p_status: "dismissed" })
                      }
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={busy === report.id}
                    onClick={() =>
                      act(report.id, "admin_resolve_report", { p_id: report.id, p_status: "open" })
                    }
                  >
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminReports;
