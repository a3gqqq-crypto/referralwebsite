import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import Icon from "../Icon";
import PlayerChip, { PLAYER_COLUMNS } from "../PlayerChip";
import SkeletonRows from "../SkeletonRows";
import { COSMETICS, SLOTS } from "../../data/cosmetics";
import { useMyProfile } from "../../context/ProfileContext";
import { loadStaff } from "../../data/staff";
import { adminCall, timeAgo } from "./adminApi";

const COLUMNS = `${PLAYER_COLUMNS}, chat_banned`;

// Matches usernames and display names. Keeps only letters, numbers, spaces and
// underscores so nothing can act as a LIKE wildcard or break the PostgREST filter.
const toPattern = (query) =>
  query.replace(/[^\p{L}\p{N} _]/gu, "").replace(/\s+/g, " ").trim();

function RoleButtons({ person, role, busy, run }) {
  const setRole = (next, text, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    run("admin_set_role", { p_user: person.id, p_role: next }, text, () => loadStaff({ force: true }));
  };

  if (!role) {
    return (
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy}
        onClick={() =>
          setRole("admin", "Now an admin.", `Make ${person.username} an admin? They'll get the admin panel.`)
        }
      >
        <Icon name="shield" size={14} />
        Make admin
      </button>
    );
  }

  return (
    <>
      {role === "admin" ? (
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            setRole("owner", "Now an owner.", `Make ${person.username} an owner? Owners can add and remove admins.`)
          }
        >
          <Icon name="crown" size={14} />
          Make owner
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => setRole("admin", "Now an admin.")}
        >
          Change to admin
        </button>
      )}

      <button
        type="button"
        className="btn btn-sm"
        disabled={busy}
        onClick={() =>
          setRole(null, "Staff role removed.", `Remove ${person.username}'s ${role} role and admin access?`)
        }
      >
        Remove {role}
      </button>
    </>
  );
}

function UserRow({ person, isMe, role, tagHidden, canManageRoles, onUpdated }) {
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const run = async (fn, args, successText, afterSuccess) => {
    setBusy(true);
    setNotice(null);

    const result = await adminCall(fn, args);

    if (result.ok) await afterSuccess?.();

    setBusy(false);
    setNotice(result.ok ? { type: "success", text: successText } : { type: "error", text: result.error });

    if (result.ok) onUpdated?.();
  };

  return (
    <li className="admin-user card">
      <div className="admin-user-main">
        <PlayerChip player={person} size={40} />

        <span className="admin-meta">
          {person.display_name && <><span className="mono">@{person.username}</span> · </>}
          <span className="mono">{person.referral_count || 0}</span> referrals ·{" "}
          <span className="mono">{person.xp || 0}</span> XP · joined {timeAgo(person.created_at)}
        </span>

        {person.chat_banned && <span className="chip admin-banned">Chat banned</span>}
        {role && tagHidden && <span className="chip">{role} · tag hidden</span>}
      </div>

      <div className="admin-actions">
        {canManageRoles && !isMe && (
          <RoleButtons person={person} role={role} busy={busy} run={run} />
        )}

        {person.avatar && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Remove ${person.username}'s profile picture?`)) return;

              await run("admin_clear_avatar", { p_user: person.id }, "Picture removed.");

              if (person.avatar.startsWith("upload:")) {
                const { data } = await supabase.storage.from("avatars").list(person.id);
                const paths = (data || []).map((file) => `${person.id}/${file.name}`);
                if (paths.length) await supabase.storage.from("avatars").remove(paths);
              }
            }}
          >
            Remove picture
          </button>
        )}

        {person.display_name && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Remove ${person.username}'s display name "${person.display_name}"?`)) return;
              run("admin_clear_display_name", { p_user: person.id }, "Name removed.");
            }}
          >
            Remove name
          </button>
        )}

        {!isMe && !role && (
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
  const [staffOnly, setStaffOnly] = useState(false);

  const [staff, setStaff] = useState(() => new Map());
  const [hiddenTags, setHiddenTags] = useState(() => new Set());
  const myRole = staff.get(profile?.id);

  // Full list incl. hidden tags (the public list leaves hidden staff out).
  const loadAdminStaff = useCallback(async () => {
    const result = await adminCall("admin_staff_list");
    if (!result.ok) return;
    setStaff(new Map(result.data.map((row) => [row.user_id, row.role])));
    setHiddenTags(new Set(result.data.filter((row) => row.hide_tag).map((row) => row.user_id)));
  }, []);

  useEffect(() => {
    loadAdminStaff();
  }, [loadAdminStaff]);

  const staffIds = [...staff.keys()];
  const staffKey = staffIds.join(",");

  useEffect(() => {
    const pattern = toPattern(query.trim());
    let cancelled = false;

    const timer = setTimeout(async () => {
      let request = supabase.from("profiles").select(COLUMNS).not("username", "is", null);

      if (staffOnly) request = request.in("id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

      request = pattern
        ? request.or(`username.ilike."%${pattern}%",display_name.ilike."%${pattern}%"`).order("referral_count", { ascending: false })
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
  }, [query, version, staffOnly, staffKey]);

  return (
    <div className="admin-section">
      <div className="admin-search">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by name"
          aria-label="Search members by name"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      <div className="admin-toolbar admin-members-bar">
        <p className="admin-meta">
          {staffOnly ? "Owners and admins" : query.trim() ? "Matching members" : "Newest members"}
        </p>

        <button
          type="button"
          className={`btn btn-sm ${staffOnly ? "btn-sun" : "btn-ghost"}`}
          onClick={() => setStaffOnly((value) => !value)}
          aria-pressed={staffOnly}
        >
          <Icon name="shield" size={14} />
          Staff only
        </button>
      </div>

      {myRole === "owner" && (
        <p className="admin-hint">
          As an owner you can make members admins (they get this panel) or owners
          (they can also manage admins).
        </p>
      )}

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
              role={staff.get(person.id) || null}
              tagHidden={hiddenTags.has(person.id)}
              canManageRoles={myRole === "owner"}
              onUpdated={() => {
                setVersion((value) => value + 1);
                loadAdminStaff();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminUsers;
