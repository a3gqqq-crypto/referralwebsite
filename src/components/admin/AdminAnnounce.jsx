import { useCallback, useEffect, useState } from "react";

import Icon from "../Icon";
import { supabase } from "../../lib/supabaseClient";
import { adminCall, timeAgo } from "./adminApi";

const LINKS = [
  { value: "", label: "No link" },
  { value: "/events", label: "Events" },
  { value: "/leaderboard", label: "Leaderboard" },
  { value: "/invites", label: "Invites" },
  { value: "/chat", label: "Lounge" },
  { value: "/shop", label: "Shop" },
  { value: "/moments", label: "Moments" },
  { value: "/rules", label: "Rules & FAQ" },
];

// Owners only (the server checks too): a bell notification for everyone,
// pinned at the top of the Lounge until the next one or until unpinned.
function AdminAnnounce() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [pinned, setPinned] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadPinned = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, link, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setPinned(data || null);
  }, []);

  useEffect(() => {
    loadPinned();
  }, [loadPinned]);

  const send = async (event) => {
    event.preventDefault();

    if (!title.trim()) return;
    if (!window.confirm("Send this to everyone on Suffrova?")) return;

    setBusy(true);
    setNotice(null);

    const result = await adminCall("owner_announce", {
      p_title: title.trim(),
      p_body: body.trim() || null,
      p_link: link || null,
    });

    setBusy(false);

    if (!result.ok) {
      setNotice({ type: "error", text: result.error });
      return;
    }

    setTitle("");
    setBody("");
    setLink("");
    setNotice({ type: "success", text: "Sent to everyone and pinned in the Lounge 📣" });
    loadPinned();
  };

  const unpin = async () => {
    setBusy(true);
    const result = await adminCall("owner_unpin_announcement");
    setBusy(false);

    setNotice(result.ok ? { type: "success", text: "Unpinned." } : { type: "error", text: result.error });
    if (result.ok) loadPinned();
  };

  return (
    <div className="admin-section">
      {pinned && (
        <div className="admin-pinned card">
          <div>
            <span className="eyebrow">Pinned now · {timeAgo(pinned.created_at)}</span>
            <strong>{pinned.title}</strong>
            {pinned.body && <p>{pinned.body}</p>}
          </div>
          <button type="button" className="btn btn-sm" onClick={unpin} disabled={busy}>
            Unpin
          </button>
        </div>
      )}

      <form className="admin-event-form card" onSubmit={send}>
        <h3>New announcement</h3>
        <p className="muted">
          Goes to everyone's bell and gets pinned at the top of the Lounge. Replaces the current pin.
        </p>

        <div className="admin-form-grid">
          <div className="field admin-span-2">
            <label htmlFor="ann-title">Title</label>
            <input
              id="ann-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={137}
              placeholder="Round 3 starts tomorrow!"
              disabled={busy}
            />
          </div>

          <div className="field admin-span-2">
            <label htmlFor="ann-body">Message (optional)</label>
            <textarea
              id="ann-body"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={280}
              placeholder="Get your invite links ready — $50 in prizes."
              disabled={busy}
            />
          </div>

          <div className="field">
            <label htmlFor="ann-link">Tapping it opens</label>
            <select id="ann-link" value={link} onChange={(event) => setLink(event.target.value)} disabled={busy}>
              {LINKS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
          <Icon name="megaphone" size={16} />
          {busy ? "Sending…" : "Send to everyone"}
        </button>
      </form>
    </div>
  );
}

export default AdminAnnounce;
