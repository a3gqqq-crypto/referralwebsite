import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import Icon from "./Icon";
import { FramedAvatar, StyledName } from "./Cosmetics";
import { PLAYER_COLUMNS } from "./PlayerChip";
import { useSocial } from "../context/SocialContext";
import { displayNameOf, equippedFrom } from "../data/cosmetics";

import "../styles/social.css";

const MAX_MEMBERS = 20;

function useDialog() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return ref;
}

// Tickable list of friends.
function FriendPicker({ friends, picked, onToggle, max }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = friends.filter(
    (friend) =>
      friend.profile &&
      (!q ||
        friend.profile.username?.toLowerCase().includes(q) ||
        friend.profile.display_name?.toLowerCase().includes(q))
  );

  if (!friends.length) {
    return (
      <p className="group-empty">
        No friends to add yet. <Link to="/people">Find people</Link> and add them first.
      </p>
    );
  }

  return (
    <>
      {friends.length > 6 && (
        <input
          className="group-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search friends"
          aria-label="Search friends"
        />
      )}
      <ul className="group-pick-list">
        {shown.map((friend) => {
          const profile = friend.profile;
          const on = picked.has(friend.otherId);
          const equipped = equippedFrom(profile);
          return (
            <li key={friend.otherId}>
              <label className={`group-pick ${on ? "is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && picked.size >= max}
                  onChange={() => onToggle(friend.otherId)}
                />
                <FramedAvatar userId={profile.id} name={displayNameOf(profile)} frame={equipped.frame} avatar={equipped.avatar} size={34} />
                <StyledName name={displayNameOf(profile)} effect={equipped.name} />
                <span className="group-pick-check" aria-hidden="true">
                  {on && <Icon name="check" size={14} strokeWidth={3} />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function CreateGroupModal({ onClose }) {
  const ref = useDialog();
  const navigate = useNavigate();
  const { friends, refreshGroups } = useSocial();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: createError } = await supabase.rpc("create_group", {
      p_name: name,
      p_members: [...picked],
    });
    setBusy(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    await refreshGroups();
    onClose();
    navigate(`/chat/g/${data}`);
  };

  return (
    <dialog ref={ref} className="report-modal group-modal" onCancel={onClose}>
      <form className="report-modal-body" onSubmit={create}>
        <h2>New group</h2>

        <div className="field">
          <label htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="The squad 🔥"
            autoComplete="off"
            required
          />
        </div>

        <div className="group-pick-head">
          <strong>Add friends</strong>
          <span className="mono">
            {picked.size}/{MAX_MEMBERS - 1}
          </span>
        </div>

        <FriendPicker friends={friends} picked={picked} onToggle={toggle} max={MAX_MEMBERS - 1} />

        {error && <div className="notice notice-error">{error}</div>}

        <div className="report-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim() || picked.size === 0}>
            {busy ? "Creating…" : "Create group"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function GroupInfoModal({ group, onClose }) {
  const ref = useDialog();
  const navigate = useNavigate();
  const { me, friends, refreshGroups } = useSocial();
  const [members, setMembers] = useState(null);
  const [name, setName] = useState(group.name);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const isOwner = group.owner_id === me;

  const load = async () => {
    const { data: rows } = await supabase
      .from("chat_group_members")
      .select("user_id, joined_at")
      .eq("group_id", group.id)
      .order("joined_at");
    const ids = (rows || []).map((row) => row.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select(PLAYER_COLUMNS).in("id", ids)
      : { data: [] };
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
    setMembers(ids.map((id) => byId.get(id)).filter(Boolean));
  };

  useEffect(() => {
    load();
    // Loads once per open group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  const run = async (fn, args, success) => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      setNotice({ type: "error", text: error.message });
      return false;
    }
    if (success) setNotice({ type: "success", text: success });
    await Promise.all([load(), refreshGroups()]);
    return true;
  };

  const memberIds = new Set((members || []).map((member) => member.id));
  const addable = friends.filter((friend) => !memberIds.has(friend.otherId));
  const room = MAX_MEMBERS - (members?.length || 0);

  const leave = async () => {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    const ok = await run("leave_group", { p_group: group.id });
    if (ok) {
      onClose();
      navigate("/chat");
    }
  };

  return (
    <dialog ref={ref} className="report-modal group-modal" onCancel={onClose}>
      <div className="report-modal-body">
        <h2>Group info</h2>

        {isOwner ? (
          <form
            className="group-rename"
            onSubmit={(event) => {
              event.preventDefault();
              run("rename_group", { p_group: group.id, p_name: name }, "Renamed.");
            }}
          >
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} aria-label="Group name" />
            <button type="submit" className="btn btn-sm" disabled={busy || !name.trim() || name.trim() === group.name}>
              Rename
            </button>
          </form>
        ) : (
          <p className="group-title">{group.name}</p>
        )}

        {adding ? (
          <>
            <div className="group-pick-head">
              <strong>Add friends</strong>
              <span className="mono">{room} spots left</span>
            </div>
            <FriendPicker
              friends={addable}
              picked={picked}
              max={room}
              onToggle={(id) =>
                setPicked((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
            <div className="report-modal-actions">
              <button type="button" className="btn" onClick={() => setAdding(false)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || picked.size === 0}
                onClick={async () => {
                  const ok = await run("add_group_members", { p_group: group.id, p_members: [...picked] }, "Added.");
                  if (ok) {
                    setPicked(new Set());
                    setAdding(false);
                  }
                }}
              >
                Add {picked.size || ""}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="group-pick-head">
              <strong>Members</strong>
              <span className="mono">
                {members?.length ?? "…"}/{MAX_MEMBERS}
              </span>
            </div>
            <ul className="group-pick-list">
              {(members || []).map((member) => {
                const equipped = equippedFrom(member);
                return (
                  <li key={member.id} className="group-member">
                    <Link to={`/u/${encodeURIComponent(member.username)}`} className="group-member-link" onClick={onClose}>
                      <FramedAvatar userId={member.id} name={displayNameOf(member)} frame={equipped.frame} avatar={equipped.avatar} size={34} />
                      <StyledName name={displayNameOf(member)} effect={equipped.name} />
                      {member.id === group.owner_id && <span className="chip group-owner-chip">Owner</span>}
                      {member.id === me && <span className="group-you">you</span>}
                    </Link>
                    {isOwner && member.id !== me && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Remove ${displayNameOf(member)} from the group?`)) {
                            run("remove_group_member", { p_group: group.id, p_user: member.id }, "Removed.");
                          }
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="report-modal-actions group-actions">
              <button type="button" className="btn btn-ghost group-leave" onClick={leave} disabled={busy}>
                Leave group
              </button>
              {room > 0 && (
                <button type="button" className="btn" onClick={() => setAdding(true)} disabled={busy}>
                  <Icon name="userPlus" size={15} />
                  Add friends
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}

        {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}
      </div>
    </dialog>
  );
}
