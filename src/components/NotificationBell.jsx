import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";

const KIND_ICON = {
  referral: "users",
  passed: "trophy",
  level: "star",
  friend_request: "user",
  friend_accept: "chat",
  gift: "sparkles",
  payout: "gem",
};

const COLUMNS = "id, kind, title, body, link, created_at, read_at";

function timeAgo(date) {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function NotificationBell({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const rootRef = useRef(null);

  const unread = items.filter((item) => !item.read_at).length;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    supabase
      .from("notifications")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!cancelled) setItems(data || []);
      });

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((current) =>
            current.some((item) => item.id === payload.new.id) ? current : [payload.new, ...current].slice(0, 30)
          );
          setToast(payload.new);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: new Date().toISOString() })));
    // Supabase queries only send once awaited/then'd.
    supabase.rpc("mark_notifications_read").then(({ error }) => {
      if (error) console.error("Could not mark notifications read:", error);
    });
  }, []);

  // Items that were new when the panel opened stay highlighted until it closes.
  const [fresh, setFresh] = useState(() => new Set());

  const toggle = () => {
    if (!open) {
      setFresh(new Set(items.filter((item) => !item.read_at).map((item) => item.id)));
      if (unread > 0) markAllRead();
    }

    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;

    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        className={`notif-bell ${open ? "is-open" : ""}`}
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && <span className="notif-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
          </div>

          {items.length === 0 ? (
            <p className="notif-empty">
              Nothing yet. You'll hear here when someone joins with your link,
              passes you, or you level up.
            </p>
          ) : (
            <ul className="notif-list">
              {items.map((item) => {
                const content = (
                  <>
                    <span className={`notif-icon kind-${item.kind}`} aria-hidden="true">
                      <Icon name={KIND_ICON[item.kind] || "bell"} size={16} />
                    </span>
                    <span className="notif-text">
                      <strong>{item.title}</strong>
                      {item.body && <small>{item.body}</small>}
                    </span>
                    <time className="notif-time" dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
                  </>
                );

                return (
                  <li key={item.id} className={!item.read_at || fresh.has(item.id) ? "is-unread" : ""}>
                    {item.link ? (
                      <Link to={item.link} onClick={() => setOpen(false)}>{content}</Link>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {toast && !open && (
        <Link
          to={toast.link || "#"}
          className="notif-toast"
          onClick={() => setToast(null)}
          onAnimationEnd={() => setToast(null)}
          role="status"
        >
          <span className={`notif-icon kind-${toast.kind}`} aria-hidden="true">
            <Icon name={KIND_ICON[toast.kind] || "bell"} size={16} />
          </span>
          <span className="notif-text">
            <strong>{toast.title}</strong>
            {toast.body && <small>{toast.body}</small>}
          </span>
        </Link>
      )}
    </div>
  );
}

export default NotificationBell;
