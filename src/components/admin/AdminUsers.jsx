import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import Icon from "../Icon";
import PlayerChip, { PLAYER_COLUMNS } from "../PlayerChip";
import SkeletonRows from "../SkeletonRows";
import { COSMETICS, SLOTS } from "../../data/cosmetics";
import { useMyProfile } from "../../context/ProfileContext";
import { adminCall, timeAgo } from "./adminApi";

const COLUMNS = `${PLAYER_COLUMNS}, chat_banned`;

// Usernames are [a-zA-Z0-9_]; strip anything else so it can't act as a LIKE wildcard.
const toPattern = (query) =>
  query.replace(/[^a-zA-Z0-9_]/g, "").replace(/_/g, "\\_");

function UserRow({ person, isMe, onUpdated }) {
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const run = async (fn, args, successText) => {
    setBusy(true);
    setNotice(null);

    const result = await adminCall(fn, args);

    setBusy(false);
    setNotice(result.ok ? { type: "success", text: successText } : { type: "error", text: result.error });

    if (result.ok) onUpdated?.();
  };

  return (
    <li className="admin-user card">
      <div className="admin-user-main">
        <PlayerChip player={person} size={40} />

        <span className="admin-meta">
          <span className="mono">{person.referral_count || 0}</span> referrals ·{" "}
          <span className="mono">{person.xp || 0}</span> XP · joined {timeAgo(person.created_at)}
        </span>

        {person.chat_banned && <span className="chip admin-banned">Chat banned</span>}
      </div>

      <div className="admin-actions">
        {!isMe && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              run(
                "admin_set_chat_ban",
                { p_user: person.id, p_banned: !person.chat_banned },
                person.chat_banned ? "Unbanned from chat." : "Banned from chat."
              )
            }
          >
            {person.chat_banned ? "Unban from chat" : "Ban from chat"}
          </button>
        )}

        <div className="admin-grant field">
          <select
            value={item}
            onChange={(event) => setItem(event.target.value)}
            aria-label={`Item to give ${person.username}`}
          >
            <option value="">Give an item…</option>
            {Object.keys(SLOTS).map((slot) => (
              <optgroup key={slot} label={SLOTS[slot].label}>
                {COSMETICS.filter((cosmetic) => cosmetic.type === slot).map((cosmetic) => (
                  <option key={cosmetic.id} value={cosmetic.id}>
                    {cosmetic.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy || !item}
            onClick={() =>
              run(
                "admin_grant_cosmetic",
                { p_user: person.id, p_cosmetic: item },
                `Gave ${COSMETICS.find((cosmetic) => cosmetic.id === item)?.name}.`
              )
            }
          >
            Give
          </button>
        </div>
      </div>

      {notice && <div className={`notice notice-${notice.type} admin-row-notice`}>{notice.text}</div>}
    </li>
  );
}

function AdminUsers() {
  const { profile } = useMyProfile();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const pattern = toPattern(query.trim());
    let cancelled = false;

    const timer = setTimeout(async () => {
      let request = supabase.from("profiles").select(COLUMNS).not("username", "is", null);

      request = pattern
        ? request.ilike("username", `%${pattern}%`).order("referral_count", { ascending: false })
        : request.order("created_at", { ascending: false });

      const { data, error: loadError } = await request.limit(30);

      if (cancelled) return;

      if (loadError) {
        console.error(loadError);
        setError("Could not load members.");
      } else {
        setError("");
        setPeople(data || []);
      }
    }, pattern ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, version]);

  return (
    <div className="admin-section">
      <div className="admin-search">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by username"
          aria-label="Search members by username"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      <p className="admin-meta">
        {query.trim() ? "Matching members" : "Newest members"}
      </p>

      {error && <div className="notice notice-error">{error}</div>}

      {!people ? (
        <SkeletonRows count={4} />
      ) : people.length === 0 ? (
        <p className="admin-empty">Nobody by that name.</p>
      ) : (
        <ul className="admin-list">
          {people.map((person) => (
            <UserRow
              key={person.id}
              person={person}
              isMe={person.id === profile?.id}
              onUpdated={() => setVersion((value) => value + 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminUsers;
